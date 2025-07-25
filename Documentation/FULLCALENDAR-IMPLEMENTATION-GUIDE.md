# Documentation Complète - Gestion des Calendriers avec FullCalendar

## Table des matières

1. [Architecture et Composants](#architecture-et-composants)
2. [Types d'Événements et Classification](#types-dévénements-et-classification)
3. [Gestion des Dates et Fuseaux Horaires](#gestion-des-dates-et-fuseaux-horaires)
4. [Implémentation FullCalendar](#implémentation-fullcalendar)
5. [Bonnes Pratiques et Solutions Robustes](#bonnes-pratiques-et-solutions-robustes)
6. [Dépannage et Cas Limites](#dépannage-et-cas-limites)
7. [Exemples de Code](#exemples-de-code)

---

## 1. Architecture et Composants

### Structure des Fichiers

```
src/app/[locale]/(dashboard)/_components/establishments/
├── menus-shared.tsx          # Interface principale avec onglets
├── menus-calendar.tsx        # Composant FullCalendar principal
└── menus1-calendar.tsx       # Composant de test (supprimé)
```

### Composants Principaux

#### `menus-shared.tsx`

- **Rôle** : Interface utilisateur avec onglets (Liste/Calendrier)
- **Fonctionnalités** :
  - Affichage des menus en liste
  - Intégration du calendrier
  - Gestion des modales (création/modification)
  - Association produits-menus

#### `menus-calendar.tsx`

- **Rôle** : Composant FullCalendar principal
- **Fonctionnalités** :
  - Affichage des événements selon leur type
  - Classification automatique des schedules
  - Génération d'événements FullCalendar
  - Gestion des interactions (clic sur date/événement)

---

## 2. Types d'Événements et Classification

### Classification Automatique des Schedules

Le système classe automatiquement chaque schedule selon ses propriétés :

```typescript
// Logique de classification
if (schedule.day_of_week && schedule.start_time)
  → "recurrent-heures"      // Récurrent hebdomadaire avec horaires
else if (schedule.day_of_week)
  → "recurrent-all-day"     // Récurrent hebdomadaire toute la journée
else if (schedule.valid_from && schedule.valid_until && schedule.start_time)
  → "plage-heures"          // Plage de dates avec horaires
else if (schedule.valid_from && schedule.valid_until)
  → "plage-all-day"         // Plage de dates toute la journée
else if (schedule.start_time)
  → "ponctuel-heures"       // Événement ponctuel avec horaires
else
  → "ponctuel-all-day"      // Événement ponctuel toute la journée
```

### Types d'Événements Supportés

| Type                | Description                         | Exemple                                | Format FullCalendar              |
| ------------------- | ----------------------------------- | -------------------------------------- | -------------------------------- |
| `permanent`         | Menu disponible tous les jours      | Happy Hour                             | `allDay: true`                   |
| `recurrent-heures`  | Récurrent hebdo avec horaires       | Boissons (jeudi 20h-22h)               | `rrule` + `duration`             |
| `recurrent-all-day` | Récurrent hebdo toute la journée    | -                                      | `rrule` + `allDay: true`         |
| `plage-heures`      | Plage de dates avec horaires        | Carte du Soir (22-25 juillet 18h-22h)  | `start` + `end` avec heures      |
| `plage-all-day`     | Plage de dates toute la journée     | Carte du Midi (25-28 juillet)          | `start` + `end` + `allDay: true` |
| `ponctuel-heures`   | Événement ponctuel avec horaires    | Événement spécial (15 juillet 19h-21h) | `start` + `end` avec heures      |
| `ponctuel-all-day`  | Événement ponctuel toute la journée | Fermeture exceptionnelle               | `start` + `allDay: true`         |

---

## 3. Gestion des Dates et Fuseaux Horaires

### Principe Fondamental

**Stockage en base** : Toujours en heure locale pour les horaires métier
**Affichage** : Format local sans UTC pour FullCalendar

### Règle de Conversion

```typescript
// ❌ INCORRECT - Génère UTC
const dtstart = firstDate.toISOString().slice(0, 19); // 2025-07-03T18:00:00Z

// ✅ CORRECT - Format local
const dtstart = `${year}-${pad(month + 1)}-${pad(day)}T${pad(h)}:${pad(m)}:${pad(s)}`;
// Résultat: 2025-07-03T20:00:00 (heure locale)
```

### Configuration FullCalendar

```typescript
<FullCalendar
  timeZone="local"           // Utilise le fuseau local du navigateur
  events={events}            // Événements au format local
  // ... autres props
/>
```

---

## 4. Implémentation FullCalendar

### Configuration de Base

```typescript
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import rrulePlugin from "@fullcalendar/rrule";

<FullCalendar
  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin]}
  initialView="timeGridWeek"
  headerToolbar={{
    left: "prev,next today",
    center: "title",
    right: "dayGridMonth,timeGridWeek,timeGridDay",
  }}
  locale="fr"
  buttonText={{
    today: "Aujourd'hui",
    month: "Mois",
    week: "Semaine",
    day: "Jour",
  }}
  height="auto"
  events={events}
  timeZone="local"
  editable={false}
  selectable={true}
  selectMirror={true}
  dayMaxEvents={true}
  weekends={true}
  firstDay={1}
/>
```

### Génération d'Événements

#### ⚠️ APPROCHE PERSONNALISÉE (Non recommandée par FullCalendar)

**Note importante** : La solution implémentée utilise une approche personnalisée qui génère des événements simples au lieu d'utiliser la récurrence native de FullCalendar (`rrule`). Cette approche a été choisie pour résoudre des problèmes d'affichage spécifiques, mais n'est pas la méthode recommandée par FullCalendar.

**Pourquoi cette approche ?**

- Résout le problème d'affichage en points dans la vue mois
- Évite les bugs liés au plugin `rrule`
- Simplifie la gestion des fuseaux horaires
- Améliore la cohérence visuelle entre les vues

**Inconvénients :**

- Plus d'événements dans le DOM
- Calcul à chaque changement de vue
- Perte de la "récurrence native" FullCalendar

#### Événements Récurrents Horaires (Approche Personnalisée)

```typescript
// Fonction pour générer les événements récurrents en événements simples
function generateRecurringEvents(schedule: any, menu: any, currentView: string, currentDate: Date, color: string) {
  const events: any[] = [];

  // Obtenir la période visible
  const { start: viewStart, end: viewEnd } = getVisiblePeriod(currentView, currentDate);

  // Calculer toutes les occurrences dans la période visible
  let checkDate = new Date(viewStart);
  const endDate = new Date(viewEnd);

  // Conversion correcte des jours de la semaine
  // day_of_week: 1=lundi, 2=mardi, ..., 7=dimanche
  // JavaScript: 0=dimanche, 1=lundi, ..., 6=samedi
  const targetDay = schedule.day_of_week === 7 ? 0 : schedule.day_of_week;

  while (checkDate <= endDate) {
    if (checkDate.getDay() === targetDay) {
      const eventDate = format(checkDate, "yyyy-MM-dd");

      if (schedule.start_time && schedule.end_time) {
        // Événement avec heures - adapter selon la vue
        if (currentView === "dayGridMonth") {
          // En vue mois : forcer allDay pour un affichage en bloc
          events.push({
            id: `${menu.id}-${schedule.id}-${eventDate}`,
            title: `${menu.name} (${schedule.start_time}-${schedule.end_time})`,
            start: eventDate,
            allDay: true,
            backgroundColor: color,
            borderColor: color,
            textColor: "white",
            extendedProps: {
              menu,
              schedule,
              type: "recurrent-heures",
              originalStart: schedule.start_time,
              originalEnd: schedule.end_time,
            },
          });
        } else {
          // En vue semaine/jour : affichage horaire normal
          events.push({
            id: `${menu.id}-${schedule.id}-${eventDate}`,
            title: menu.name,
            start: `${eventDate}T${schedule.start_time}`,
            end: `${eventDate}T${schedule.end_time}`,
            backgroundColor: color,
            borderColor: color,
            textColor: "white",
            extendedProps: { menu, schedule, type: "recurrent-heures" },
          });
        }
      } else {
        // Événement all-day
        events.push({
          id: `${menu.id}-${schedule.id}-${eventDate}`,
          title: menu.name,
          start: eventDate,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          textColor: "white",
          extendedProps: { menu, schedule, type: "recurrent-all-day" },
        });
      }
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }

  return events;
}
```

#### Événements Récurrents Horaires (Approche Recommandée FullCalendar)

```typescript
{
  id: `${menu.id}-schedule-${idx}`,
  title: menu.name,
  rrule: {
    freq: "weekly",
    byweekday: weekday,        // 'mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'
    dtstart: dtstart,          // Format local: 2025-07-03T20:00:00
  },
  duration: "02:00:00",        // Durée calculée
  backgroundColor: "#F59E0B",
  borderColor: "#F59E0B",
  textColor: "white",
  extendedProps: { menu, schedule, type: "recurrent-heures" },
}
```

#### Événements de Plage

```typescript
{
  id: `${menu.id}-schedule-${idx}`,
  title: menu.name,
  start: `${valid_from}T${start_time}`,                    // 2025-07-25T12:00:00
  end: `${addDays(valid_until, 1)}T${end_time}`,          // 2025-07-29T14:00:00 (+1 jour)
  backgroundColor: color,
  borderColor: color,
  textColor: "white",
  extendedProps: { menu, schedule, type: "plage-heures" },
}
```

---

## 5. Bonnes Pratiques et Solutions Robustes

### Règle de la Date de Fin Exclusive

FullCalendar considère la date de fin comme **exclusive**. Pour inclure le dernier jour :

```typescript
// ❌ INCORRECT - Le dernier jour est exclu
end: "2025-07-28";

// ✅ CORRECT - Le dernier jour est inclus
end: format(addDays(new Date("2025-07-28"), 1), "yyyy-MM-dd");
// Résultat: "2025-07-29"
```

### Gestion des Mois Complets

Pour les événements permanents, inclure le dernier jour du mois :

```typescript
// ✅ Inclut le 31 juillet si le mois a 31 jours
end: format(addDays(endOfMonth(currentDate), 1), "yyyy-MM-dd");
```

### Normalisation des Heures

```typescript
function normalizeTimeString(time?: string): string {
  if (!time) return "00:00:00";
  if (/^\d{2}:\d{2}$/.test(time)) return time + ":00";
  return time;
}
```

---

## 6. Dépannage et Cas Limites

### Problèmes Courants

#### 1. Événements Affichés à 00h00

**Cause** : Utilisation de `.toISOString()` qui génère UTC
**Solution** : Générer manuellement le format local

#### 2. Dernier Jour Manquant

**Cause** : Date de fin non exclusive
**Solution** : Ajouter +1 jour à la date de fin

#### 3. Affichage en Point dans Vue Mois

**Comportement normal** : FullCalendar affiche les événements horaires en points en vue mois
**Solution recommandée** : Utiliser la vue semaine/jour pour voir les blocs horaires
**Solution personnalisée** : Générer des événements `allDay: true` en vue mois avec les heures dans le titre

#### 4. Décalage d'Heure

**Cause** : Confusion entre UTC et heure locale
**Solution** :

- Stocker en heure locale en base
- Générer en format local pour FullCalendar
- Utiliser `timeZone: 'local'`

### Debug et Logs

```typescript
// Logs de diagnostic
console.log("--- LOG COMPARATIF ---");
console.log("Menu:", menu.name, "| Schedule:", schedule);
console.log("Display:", display);
console.log("EventObj:", eventObj);
```

---

## 7. Exemples de Code

### Fonction de Génération d'Événements

```typescript
const events = useMemo(() => {
  if (!menus) return [];
  const result: any[] = [];

  menus.forEach((menu: Menu) => {
    // Menu permanent
    if (!menu.schedules || menu.schedules.length === 0) {
      result.push({
        id: `${menu.id}-permanent`,
        title: menu.name,
        start: format(startOfMonth(currentDate), "yyyy-MM-dd"),
        end: format(addDays(endOfMonth(currentDate), 1), "yyyy-MM-dd"),
        allDay: true,
        backgroundColor: "#10B981",
        borderColor: "#10B981",
        textColor: "white",
        extendedProps: { menu, type: "permanent" },
      });
      return;
    }

    // Schedules
    menu.schedules.forEach((schedule: MenuSchedule, idx: number) => {
      const display = prepareScheduleForDisplay(schedule, currentView, currentDate, menu.name);

      if (display.type === "recurrent-heures") {
        // Logique pour événements récurrents horaires
        const weekday = ["mo", "tu", "we", "th", "fr", "sa", "su"][(schedule.day_of_week ?? 1) - 1];
        const [h, m, s] = schedule.start_time
          ? normalizeTimeString(schedule.start_time).split(":").map(Number)
          : [0, 0, 0];

        // Calcul de la première occurrence
        let firstDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        let jsDay = (schedule.day_of_week ?? 1) % 7;
        while (firstDate.getDay() !== jsDay) {
          firstDate.setDate(firstDate.getDate() + 1);
        }
        firstDate.setHours(h, m, s || 0, 0);

        // Format local pour dtstart
        const pad = (n: number) => n.toString().padStart(2, "0");
        const dtstart = `${firstDate.getFullYear()}-${pad(firstDate.getMonth() + 1)}-${pad(firstDate.getDate())}T${pad(h)}:${pad(m)}:${pad(s || 0)}`;

        result.push({
          id: `${menu.id}-schedule-${idx}`,
          title: menu.name,
          rrule: {
            freq: "weekly",
            byweekday: weekday,
            dtstart: dtstart,
          },
          duration:
            schedule.start_time && schedule.end_time
              ? (() => {
                  const [h1, m1, s1] = normalizeTimeString(schedule.start_time || "00:00:00")
                    .split(":")
                    .map(Number);
                  const [h2, m2, s2] = normalizeTimeString(schedule.end_time || "00:00:00")
                    .split(":")
                    .map(Number);
                  const d = h2 * 60 + m2 - (h1 * 60 + m1);
                  return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}:00`;
                })()
              : "01:00:00",
          backgroundColor: "#F59E0B",
          borderColor: "#F59E0B",
          textColor: "white",
          extendedProps: { menu, schedule, type: display.type },
        });
      }

      // Autres types...
    });
  });

  return result;
}, [menus, currentView, currentDate]);
```

### Fonction de Classification

```typescript
function prepareScheduleForDisplay(
  schedule: MenuSchedule | null,
  viewType: string,
  currentDate: Date,
  menuName: string,
) {
  if (!schedule) {
    // Menu permanent
    const { start, end } = getVisiblePeriod(viewType, currentDate);
    return {
      type: "permanent",
      valid_from: start,
      valid_until: end,
    };
  }

  // Classification selon les propriétés
  let type = "";
  if (schedule.day_of_week && schedule.start_time) type = "recurrent-heures";
  else if (schedule.day_of_week) type = "recurrent-all-day";
  else if (schedule.valid_from && schedule.valid_until && schedule.start_time) type = "plage-heures";
  else if (schedule.valid_from && schedule.valid_until) type = "plage-all-day";
  else if (schedule.start_time) type = "ponctuel-heures";
  else type = "ponctuel-all-day";

  return {
    type,
    valid_from: schedule.valid_from,
    valid_until: schedule.valid_until,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    day_of_week: schedule.day_of_week,
  };
}
```

### Fonction de Période Visible

```typescript
function getVisiblePeriod(viewType: string, currentDate: Date) {
  if (viewType === "dayGridMonth") {
    return {
      start: format(startOfMonth(currentDate), "yyyy-MM-dd"),
      end: format(addDays(endOfMonth(currentDate), 1), "yyyy-MM-dd"),
    };
  }
  if (viewType === "timeGridWeek") {
    return {
      start: format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      end: format(addDays(endOfWeek(currentDate, { weekStartsOn: 1 }), 1), "yyyy-MM-dd"),
    };
  }
  // Par défaut, jour
  return {
    start: format(currentDate, "yyyy-MM-dd"),
    end: format(addDays(currentDate, 1), "yyyy-MM-dd"),
  };
}
```

---

## Résumé des Points Clés

1. **Stockage** : Heures locales en base pour les horaires métier
2. **Affichage** : Format local sans UTC pour FullCalendar
3. **Dates de fin** : Toujours ajouter +1 jour pour inclure le dernier jour
4. **Classification** : Automatique selon les propriétés du schedule
5. **Récurrence** :
   - **Approche recommandée** : Utiliser `rrule` avec `dtstart` local et `duration`
   - **Approche personnalisée** : Générer des événements simples (voir section 4)
6. **Debug** : Logs détaillés pour diagnostiquer les problèmes
7. **Robustesse** : Gestion des cas limites (fin de mois, fuseaux, etc.)
8. **Affichage adaptatif** : Adapter le format selon la vue (mois vs semaine/jour)

---

## Historique des Problèmes Résolus

### Problème 1 : Menu "Boissons" affiché à 00h00

- **Cause** : Utilisation de `.toISOString()` générant UTC
- **Solution initiale** : Génération manuelle du format local pour `dtstart`
- **Solution finale** : Approche personnalisée avec génération d'événements simples (voir section 4)

### Problème 2 : Carte du Midi (25-28) affichant seulement 25, 26, 27

- **Cause** : Date de fin non exclusive dans FullCalendar
- **Solution** : Ajout de +1 jour à `valid_until`

### Problème 3 : Happy Hour permanent n'incluant pas le 31 juillet

- **Cause** : `endOfMonth` ne générant pas le dernier jour
- **Solution** : Utilisation de `endOfMonth + 1 jour`

### Problème 4 : Décalage d'heure de 2h

- **Cause** : Confusion entre UTC et heure locale
- **Solution** : Stockage local en base + format local pour FullCalendar

### Problème 5 : Affichage en points pour les événements récurrents horaires

- **Cause** : Comportement normal de FullCalendar en vue mois pour les événements avec heures
- **Solution recommandée** : Accepter l'affichage en points ou utiliser les vues semaine/jour
- **Solution personnalisée** : Générer des événements `allDay: true` en vue mois avec adaptation du titre

---

## Références

- [Documentation FullCalendar](https://fullcalendar.io/docs/)
- [Plugin RRule FullCalendar](https://fullcalendar.io/docs/rrule-plugin)
- [Gestion des Timezones FullCalendar](https://fullcalendar.io/docs/timeZone)
- [Bibliothèque RRule](https://github.com/jakubroztocil/rrule)

---

_Documentation créée le : $(date)_
_Version : 1.0_
_Dernière mise à jour : $(date)_
