# 📚 Documentation Complète : Booking Exceptions Realtime

## 🎯 **VUE D'ENSEMBLE**

Système complet de gestion des exceptions de réservation avec realtime automatique, interface partagée entre System Admin et Org Admin, intégration FullCalendar, et récupération dynamique des services et créneaux depuis la base de données.

---

## 📁 **ARCHITECTURE DES FICHIERS**

### **1. Hook Realtime Principal**

```
src/hooks/use-booking-exceptions-crud.ts
```

- Hook complet avec CRUD + Realtime
- Gestion des états (loading, error, isConnected)
- Filtrage par organisation
- Suppression logique (`deleted = true`)

### **2. Composant Partagé**

```
src/app/[locale]/(root)/(dashboard)/_components/establishments/booking-exceptions-shared.tsx
```

- Interface utilisateur complète
- FullCalendar + liste des exceptions
- Modal de création conditionnelle
- Gestion des 4 types d'exceptions
- **NOUVEAU** : Récupération dynamique des services et créneaux

### **3. Pages d'Entrée**

```
src/app/[locale]/(root)/(dashboard)/admin/organizations/[id]/establishments/[establishmentId]/booking-exceptions/page.tsx
src/app/[locale]/(root)/(dashboard)/dashboard/establishments/[id]/booking-exceptions/page.tsx
```

---

## 🔧 **IMPLÉMENTATION TECHNIQUE**

### **1. Hook Realtime (`use-booking-exceptions-crud.ts`)**

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type BookingException = Tables<"booking_exceptions">;

interface UseBookingExceptionsRealtimeProps {
  establishmentId: string;
  organizationId: string;
}

interface UseBookingExceptionsRealtimeReturn {
  exceptions: BookingException[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  create: (data: CreateBookingExceptionData) => void;
  update: (data: { id: string } & UpdateBookingExceptionData) => void;
  delete: (id: string) => void;
  refresh: () => void;
}

export function useBookingExceptionsRealtime({
  establishmentId,
  organizationId,
}: UseBookingExceptionsRealtimeProps): UseBookingExceptionsRealtimeReturn {
  // États locaux
  const [exceptions, setExceptions] = useState<BookingException[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Références
  const supabase = createClient();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  // Fonction de chargement initial
  const loadExceptions = useCallback(async () => {
    if (!establishmentId || !organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("booking_exceptions")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setExceptions(data || []);
    } catch (err) {
      console.error("❌ Erreur lors du chargement des exceptions:", err);
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [establishmentId, organizationId, supabase]);

  // Mutation pour créer une exception
  const createMutation = useMutation({
    mutationFn: async (data: CreateBookingExceptionData) => {
      const { data: newException, error } = await supabase
        .from("booking_exceptions")
        .insert({
          ...data,
          status: data.status ?? "active",
        })
        .select()
        .single();

      if (error) throw error;
      return newException;
    },
    onSuccess: (data) => {
      toast.success("Exception créée avec succès");
    },
    onError: (error) => {
      console.error("❌ Erreur lors de la création:", error);
      toast.error("Erreur lors de la création de l'exception");
    },
  });

  // Mutation pour mettre à jour une exception
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateBookingExceptionData) => {
      const { data: updatedException, error } = await supabase
        .from("booking_exceptions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updatedException;
    },
    onSuccess: (data) => {
      toast.success("Exception modifiée avec succès");
    },
    onError: (error) => {
      console.error("❌ Erreur lors de la modification:", error);
      toast.error("Erreur lors de la modification de l'exception");
    },
  });

  // Mutation pour supprimer une exception
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("booking_exceptions").update({ deleted: true }).eq("id", id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      toast.success("Exception supprimée avec succès");
    },
    onError: (error) => {
      console.error("❌ Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression de l'exception");
    },
  });

  // Configuration du realtime
  useEffect(() => {
    if (!establishmentId || !organizationId) return;

    // Chargement initial
    loadExceptions();

    // Configuration du channel realtime
    const channel = supabase
      .channel(`booking-exceptions-${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_exceptions",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        (payload) => {
          console.log("🔄 Booking exceptions realtime event:", payload);

          // Vérifier que le payload appartient à la bonne organisation
          if (payload.new && (payload.new as any).organization_id !== organizationId) {
            return; // Ignorer les événements d'autres organisations
          }

          setExceptions((prevExceptions) => {
            switch (payload.eventType) {
              case "INSERT":
                if (payload.new && !(payload.new as any).deleted) {
                  return [payload.new as BookingException, ...prevExceptions];
                }
                return prevExceptions;

              case "UPDATE":
                if (payload.new) {
                  const newData = payload.new as BookingException;
                  if (newData.deleted) {
                    // Suppression logique
                    return prevExceptions.filter((exception) => exception.id !== newData.id);
                  } else {
                    // Mise à jour
                    return prevExceptions.map((exception) => (exception.id === newData.id ? newData : exception));
                  }
                }
                return prevExceptions;

              case "DELETE":
                const oldData = payload.old as BookingException;
                return prevExceptions.filter((exception) => exception.id !== oldData.id);

              default:
                return prevExceptions;
            }
          });
        },
      )
      .subscribe((status) => {
        console.log("📡 Booking exceptions realtime status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [establishmentId, organizationId, loadExceptions, supabase]);

  // Fonction de rafraîchissement manuel
  const refresh = useCallback(() => {
    loadExceptions();
  }, [loadExceptions]);

  return {
    exceptions,
    loading,
    error,
    isConnected,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    refresh,
  };
}
```

### **2. Hook pour Booking Slots**

```typescript
// Hook pour récupérer les booking_slots de l'établissement
function useEstablishmentBookingSlots(establishmentId: string) {
  return useQuery({
    queryKey: ["establishment-booking-slots", establishmentId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("booking_slots")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .eq("is_active", true)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!establishmentId,
  });
}

// Fonction pour générer les créneaux à partir d'un booking_slot
function generateTimeSlotsFromBookingSlot(slot: any) {
  const slots: { id: number; time: string; label: string }[] = [];
  const startTime = new Date(`2000-01-01T${slot.start_time}`);
  const endTime = new Date(`2000-01-01T${slot.end_time}`);

  let slotId = 0;
  const currentTime = new Date(startTime);

  while (currentTime < endTime) {
    const timeString = currentTime.toTimeString().slice(0, 5);
    const label = currentTime.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    slots.push({
      id: slotId,
      time: timeString,
      label: label,
    });

    // Incrémenter de 15 minutes
    currentTime.setMinutes(currentTime.getMinutes() + 15);
    slotId++;
  }

  return slots;
}
```

### **3. Types de Données**

```typescript
interface CreateBookingExceptionData {
  establishment_id: string;
  organization_id: string;
  exception_type: "period" | "single_day" | "service" | "time_slots";
  date?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
  status?: "active" | "inactive";
  booking_slot_id?: string;
  closed_slots?: number[];
}

interface UpdateBookingExceptionData {
  exception_type?: "period" | "single_day" | "service" | "time_slots";
  date?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
  status?: "active" | "inactive";
  booking_slot_id?: string;
  closed_slots?: number[];
}

// Type pour les booking_slots
interface BookingSlot {
  id: string;
  day_of_week: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  is_active: boolean | null;
  deleted: boolean | null;
  establishment_id: string;
}
```

---

## 🎨 **COMPOSANT PARTAGÉ**

### **Structure Principale**

```typescript
export function BookingExceptionsShared({ establishmentId, organizationId }: BookingExceptionsSharedProps) {
  // Hook realtime
  const {
    exceptions,
    loading,
    error,
    isConnected,
    create,
    update,
    delete: deleteException,
    refresh,
  } = useBookingExceptionsRealtime({
    establishmentId,
    organizationId,
  });

  // Hook pour récupérer les booking_slots
  const {
    data: bookingSlots,
    isLoading: slotsLoading,
    error: slotsError,
  } = useEstablishmentBookingSlots(establishmentId);

  // États pour la modale
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExceptionType, setSelectedExceptionType] = useState<ExceptionType>("period");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  // États pour les sélections dans la modale
  const [periodStartDate, setPeriodStartDate] = useState<Date>();
  const [periodEndDate, setPeriodEndDate] = useState<Date>();
  const [singleDate, setSingleDate] = useState<Date>();
  const [serviceDate, setServiceDate] = useState<Date>();
  const [selectedService, setSelectedService] = useState<string>("");
  const [timeSlotsDate, setTimeSlotsDate] = useState<Date>();
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<number[]>([]);

  // États pour le formulaire latéral
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  // Fonction pour obtenir les services disponibles pour une date donnée
  const getServicesForDate = (date: Date) => {
    if (!bookingSlots || !date) return [];

    const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
    return bookingSlots.filter((slot) => slot.day_of_week === dayOfWeek);
  };

  // Fonction pour obtenir les créneaux d'un service
  const getTimeSlotsForService = (serviceId: string) => {
    const service = bookingSlots?.find((slot) => slot.id === serviceId);
    if (!service) return [];
    return generateTimeSlotsFromBookingSlot(service);
  };

  // Fonction pour obtenir le nom du service
  const getServiceName = (serviceId: string) => {
    const service = bookingSlots?.find((slot) => slot.id === serviceId);
    return service?.slot_name || "Service inconnu";
  };
}
```

### **Fonction getCalendarEvents()**

```typescript
const getCalendarEvents = () => {
  return exceptions
    .map((exception) => {
      let event = {
        id: exception.id,
        title: exception.reason || "Exception sans raison",
        backgroundColor: "",
        borderColor: "",
        textColor: "#ffffff",
        className: "cursor-pointer hover:opacity-80",
      };

      switch (exception.exception_type) {
        case "period":
          if (!exception.start_date || !exception.end_date) return null;
          event.backgroundColor = "#ef4444";
          event.borderColor = "#dc2626";
          event.title = `${exception.reason || "Période"} (${exception.start_date} - ${exception.end_date})`;

          // Ajouter un jour à la date de fin pour que FullCalendar affiche la période complète (inclusive)
          const endDate = new Date(exception.end_date);
          endDate.setDate(endDate.getDate() + 1);
          const endDateStr = endDate.toISOString().split("T")[0];

          return {
            ...event,
            start: exception.start_date,
            end: endDateStr,
          };
        case "single_day":
          if (!exception.date) return null;
          event.backgroundColor = "#f59e0b";
          event.borderColor = "#d97706";
          event.title = `${exception.reason || "Jour unique"} (${exception.date})`;
          return {
            ...event,
            start: exception.date,
            end: exception.date,
          };
        case "service":
          if (!exception.date) return null;
          event.backgroundColor = "#8b5cf6";
          event.borderColor = "#7c3aed";
          event.title = `${exception.reason || "Service"} (${exception.date})`;
          return {
            ...event,
            start: exception.date,
            end: exception.date,
          };
        case "time_slots":
          if (!exception.date) return null;
          event.backgroundColor = "#3b82f6";
          event.borderColor = "#2563eb";
          event.title = `${exception.reason || "Créneaux"} - Créneaux (${exception.date})`;
          return {
            ...event,
            start: exception.date,
            end: exception.date,
          };
        default:
          return null;
      }
    })
    .filter((event) => event !== null);
};
```

### **Fonction getExceptionsForDate()**

```typescript
const getExceptionsForDate = (date: Date) => {
  const dateStr = format(date, "yyyy-MM-dd");
  const filteredExceptions = exceptions.filter((exception) => {
    let isIncluded = false;

    switch (exception.exception_type) {
      case "period":
        // Pour les périodes, vérifier si la date est dans la plage (inclusive)
        if (exception.start_date && exception.end_date) {
          isIncluded = dateStr >= exception.start_date && dateStr <= exception.end_date;
        }
        return isIncluded;
      case "single_day":
        // Pour les jours uniques, vérifier si la date correspond exactement
        if (exception.date) {
          isIncluded = dateStr === exception.date;
        }
        return isIncluded;
      case "service":
        // Pour les services, vérifier si la date correspond
        if (exception.date) {
          isIncluded = dateStr === exception.date;
        }
        return isIncluded;
      case "time_slots":
        // Pour les créneaux, vérifier si la date correspond
        if (exception.date) {
          isIncluded = dateStr === exception.date;
        }
        return isIncluded;
      default:
        return false;
    }
  });

  return filteredExceptions;
};
```

### **Fonction handleValidateCreation()**

```typescript
const handleValidateCreation = () => {
  // Préparer les données selon le type d'exception
  const exceptionData: any = {
    establishment_id: establishmentId,
    organization_id: organizationId,
    exception_type: selectedExceptionType,
    reason,
    status,
  };

  let isValid = true;
  let errorMessage = "";

  switch (selectedExceptionType) {
    case "period":
      if (periodStartDate && periodEndDate) {
        exceptionData.start_date = format(periodStartDate, "yyyy-MM-dd");
        exceptionData.end_date = format(periodEndDate, "yyyy-MM-dd");
      } else {
        isValid = false;
        errorMessage = "Veuillez sélectionner une période valide";
      }
      break;
    case "single_day":
      if (singleDate) {
        exceptionData.date = format(singleDate, "yyyy-MM-dd");
      } else {
        isValid = false;
        errorMessage = "Veuillez sélectionner une date";
      }
      break;
    case "service":
      if (serviceDate && selectedService) {
        exceptionData.date = format(serviceDate, "yyyy-MM-dd");
        exceptionData.booking_slot_id = selectedService; // Utiliser l'ID du service
      } else {
        isValid = false;
        errorMessage = "Veuillez sélectionner une date et un service";
      }
      break;
    case "time_slots":
      if (timeSlotsDate && selectedService && selectedTimeSlots.length > 0) {
        exceptionData.date = format(timeSlotsDate, "yyyy-MM-dd");
        exceptionData.booking_slot_id = selectedService; // Utiliser l'ID du service
        exceptionData.closed_slots = selectedTimeSlots;
      } else {
        isValid = false;
        errorMessage = "Veuillez sélectionner une date, un service et au moins un créneau";
      }
      break;
  }

  // Vérifier la validité et créer l'exception
  if (!isValid) {
    // Afficher une erreur (vous pouvez utiliser toast.error ici)
    console.error("❌ Erreur de validation:", errorMessage);
    return;
  }

  // Créer l'exception via le hook realtime
  create(exceptionData);
  handleCloseModal();
};
```

---

## 📄 **PAGES D'ENTRÉE**

### **System Admin Page**

```typescript
import React from "react";
import { BookingExceptionsShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/booking-exceptions-shared";
import { useUserMetadata } from "@/hooks/use-user-metadata";

interface BookingExceptionsPageProps {
  params: Promise<{
    id: string; // organizationId
    establishmentId: string;
  }>;
}

export default function BookingExceptionsPage({ params }: BookingExceptionsPageProps) {
  const { isSystemAdmin } = useUserMetadata();
  const { id, establishmentId } = React.use(params);

  // Vérifier les permissions
  if (!isSystemAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Accès refusé</h1>
          <p className="text-muted-foreground">Vous n'avez pas les permissions pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return <BookingExceptionsShared establishmentId={establishmentId} organizationId={id} />;
}
```

### **Org Admin Page**

```typescript
import React from "react";
import { BookingExceptionsShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/booking-exceptions-shared";
import { useUserMetadata } from "@/hooks/use-user-metadata";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";

interface BookingExceptionsPageProps {
  params: Promise<{
    id: string; // establishmentId
  }>;
}

export default function BookingExceptionsPage({ params }: BookingExceptionsPageProps) {
  const { isOrgAdmin } = useUserMetadata();
  const organizationId = useOrgaUserOrganizationId();
  const { id } = React.use(params);

  // Vérifier les permissions
  if (!isOrgAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Accès refusé</h1>
          <p className="text-muted-foreground">Vous n'avez pas les permissions pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  // Affichage de chargement pour l'organizationId
  if (!organizationId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
            <p className="text-muted-foreground">Chargement de l'organisation...</p>
          </div>
        </div>
      </div>
    );
  }

  return <BookingExceptionsShared establishmentId={id} organizationId={organizationId} />;
}
```

---

## 🗄️ **SCHEMA DE BASE DE DONNÉES**

### **Table booking_exceptions**

```sql
CREATE TABLE booking_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  exception_type TEXT NOT NULL CHECK (exception_type IN ('period', 'single_day', 'service', 'time_slots')),
  date DATE,
  start_date DATE,
  end_date DATE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  booking_slot_id UUID REFERENCES booking_slots(id),
  closed_slots INTEGER[],
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);
```

### **Table booking_slots**

```sql
CREATE TABLE booking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id),
  organization_id UUID REFERENCES organizations(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  slot_name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER,
  deleted BOOLEAN DEFAULT FALSE,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);
```

### **Politiques RLS Requises**

```sql
-- Lecture
CREATE POLICY "Enable read access" ON booking_exceptions
FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM users_organizations
    WHERE organization_id = booking_exceptions.organization_id
  )
);

-- Insertion
CREATE POLICY "Enable insert access" ON booking_exceptions
FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM users_organizations
    WHERE organization_id = booking_exceptions.organization_id
  )
);

-- Mise à jour
CREATE POLICY "Enable update access" ON booking_exceptions
FOR UPDATE USING (
  auth.uid() IN (
    SELECT user_id FROM users_organizations
    WHERE organization_id = booking_exceptions.organization_id
  )
);
```

### **Activation Realtime**

```sql
-- Activer le realtime pour booking_exceptions
ALTER PUBLICATION supabase_realtime ADD TABLE booking_exceptions;
```

---

## 🎯 **TYPES D'EXCEPTIONS**

### **1. Period**

- **Champs** : `start_date`, `end_date`
- **Couleur** : Rouge (#ef4444)
- **Description** : Fermeture sur une plage de dates

### **2. Single Day**

- **Champs** : `date`
- **Couleur** : Orange (#f59e0b)
- **Description** : Fermeture sur un jour spécifique

### **3. Service**

- **Champs** : `date`, `booking_slot_id`
- **Couleur** : Violet (#8b5cf6)
- **Description** : Fermeture d'un service spécifique

### **4. Time Slots**

- **Champs** : `date`, `booking_slot_id`, `closed_slots` (array de nombres)
- **Couleur** : Bleu (#3b82f6)
- **Description** : Fermeture de créneaux spécifiques

---

## 🔄 **FLUX DE DONNÉES**

### **1. Chargement Initial**

```typescript
const { data } = await supabase
  .from("booking_exceptions")
  .select("*")
  .eq("establishment_id", establishmentId)
  .eq("organization_id", organizationId)
  .eq("deleted", false)
  .order("created_at", { ascending: false });
```

### **2. Chargement des Services**

```typescript
const { data: bookingSlots } = await supabase
  .from("booking_slots")
  .select("*")
  .eq("establishment_id", establishmentId)
  .eq("deleted", false)
  .eq("is_active", true)
  .order("day_of_week", { ascending: true })
  .order("start_time", { ascending: true });
```

### **3. Realtime Automatique**

```typescript
const channel = supabase
  .channel(`booking-exceptions-${establishmentId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "booking_exceptions",
      filter: `establishment_id=eq.${establishmentId}`,
    },
    (payload) => {
      // Gestion automatique des événements INSERT/UPDATE/DELETE
    },
  )
  .subscribe();
```

### **4. CRUD avec Feedback**

```typescript
// Création
create(exceptionData);
// → toast.success("Exception créée avec succès")
// → Realtime s'occupe de mettre à jour la liste

// Modification
update({ id, ...updates });
// → toast.success("Exception modifiée avec succès")

// Suppression
delete id;
// → toast.success("Exception supprimée avec succès")
```

---

## 🎨 **INTERFACE UTILISATEUR**

### **Layout Principal**

- **Header** : Titre + indicateur de connexion realtime + bouton "Créer l'exception"
- **Calendrier** : FullCalendar à gauche (2/3 largeur)
- **Liste** : Exceptions à droite (1/3 largeur)

### **Indicateurs de Statut**

- **Connexion realtime** : 🟢 Connecté / 🔴 Déconnecté
- **Chargement** : Spinner avec message
- **Erreur** : Message d'erreur avec bouton de retry

### **Modal de Création**

- **Type d'exception** : Dropdown pour sélectionner le type
- **Interface conditionnelle** : Selon le type sélectionné
- **Services dynamiques** : Récupération depuis `booking_slots`
- **Créneaux dynamiques** : Génération depuis `start_time`/`end_time`
- **Paramètres latéraux** : Raison et statut
- **Validation** : Vérification des données avant création

### **Modal d'Édition des Créneaux**

- **Déclenchement** : Clic sur le bouton d'édition (icône bleue) pour les exceptions de type "time_slots"
- **Interface d'édition** : Affichage du service concerné et de tous les créneaux disponibles
- **Créneaux fermés** : Affichés en rouge (sélectionnés)
- **Modification** : Clic pour cocher/décocher les créneaux
- **Compteur** : Affichage du nombre de créneaux sélectionnés
- **Logique de validation** :
  - Si des créneaux restent sélectionnés → Bouton "Modifier l'exception" (bleu)
  - Si aucun créneau n'est sélectionné → Bouton "Supprimer l'exception" (rouge)

#### **Interface d'Édition**

```typescript
// Fonction pour gérer l'édition d'une exception
const handleEditClick = (exception: any) => {
  if (exception.exception_type === "time_slots") {
    setExceptionToDelete(exception);
    setIsTimeSlotsEditMode(true);
    setEditedTimeSlots(exception.closed_slots ?? []);
    setIsDeleteModalOpen(true);
  }
};

// Fonction pour basculer un créneau dans le mode édition
const handleTimeSlotEditToggle = (slotId: number) => {
  setEditedTimeSlots((prev) => (prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]));
};

// Logique de validation dans handleConfirmDelete
if (exceptionToDelete.exception_type === "time_slots" && isTimeSlotsEditMode) {
  if (editedTimeSlots.length === 0) {
    // Supprimer l'exception si aucun créneau n'est sélectionné
    deleteException(exceptionToDelete.id);
  } else {
    // Mettre à jour l'exception avec les nouveaux créneaux
    update({
      id: exceptionToDelete.id,
      closed_slots: editedTimeSlots,
    });
  }
}
```

#### **Composant BookingExceptionsList**

```typescript
// Bouton d'édition uniquement pour les exceptions de type "time_slots"
{(exception.exception_type as string) === "time_slots" && (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => onEditClick?.(exception)}
    className="text-blue-500 hover:text-blue-600"
    title="Modifier les créneaux"
  >
    <Edit className="h-4 w-4" />
  </Button>
)}
```

### **Gestion des Services**

#### **Récupération des Services**

```typescript
const getServicesForDate = (date: Date) => {
  if (!bookingSlots || !date) return [];

  const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
  return bookingSlots.filter((slot) => slot.day_of_week === dayOfWeek);
};
```

#### **Génération des Créneaux**

```typescript
function generateTimeSlotsFromBookingSlot(slot: any) {
  const slots: { id: number; time: string; label: string }[] = [];
  const startTime = new Date(`2000-01-01T${slot.start_time}`);
  const endTime = new Date(`2000-01-01T${slot.end_time}`);

  let slotId = 0;
  const currentTime = new Date(startTime);

  while (currentTime < endTime) {
    const timeString = currentTime.toTimeString().slice(0, 5);
    const label = currentTime.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    slots.push({
      id: slotId,
      time: timeString,
      label: label,
    });

    // Incrémenter de 15 minutes
    currentTime.setMinutes(currentTime.getMinutes() + 15);
    slotId++;
  }

  return slots;
}
```

---

## 🛡️ **SÉCURITÉ**

### **Filtrage par Organisation**

```typescript
// Vérifier que le payload appartient à la bonne organisation
if (payload.new && (payload.new as any).organization_id !== organizationId) {
  return; // Ignorer les événements d'autres organisations
}
```

### **Suppression Logique**

```typescript
// Au lieu de DELETE physique
const { error } = await supabase.from("booking_exceptions").update({ deleted: true }).eq("id", id);
```

### **Permissions**

- **System Admin** : Accès à toutes les organisations
- **Org Admin** : Accès uniquement à sa propre organisation

---

## 🧪 **TESTS ET VALIDATION**

### **Tests à Effectuer**

1. **Création d'exceptions** : Tous les types
2. **Modification d'exceptions** : Changement de dates, raison, statut
3. **Suppression d'exceptions** : Suppression logique
4. **Realtime** : Synchronisation en temps réel
5. **Permissions** : Accès selon le rôle utilisateur
6. **Services dynamiques** : Vérification de la récupération des services
7. **Créneaux dynamiques** : Vérification de la génération des créneaux
8. **Édition des créneaux** :
   - Affichage du bouton d'édition pour les exceptions "time_slots"
   - Ouverture de la modal d'édition avec les créneaux actuels
   - Modification des créneaux (ajout/suppression)
   - Sauvegarde avec des créneaux restants
   - Suppression automatique si aucun créneau n'est sélectionné

### **Validation des Types**

- **Period** : Vérifier l'affichage inclusif (date de fin + 1 jour)
- **Single Day** : Vérifier l'affichage sur le bon jour
- **Service** : Vérifier l'affichage avec le nom du service depuis `booking_slots`
- **Time Slots** : Vérifier l'affichage des créneaux fermés avec le nom du service

### **Validation des Services**

- **Services disponibles** : Vérifier l'affichage des services pour la date sélectionnée
- **Aucun service** : Vérifier le message "Aucun service configuré pour cette date"
- **Créneaux générés** : Vérifier la génération correcte des créneaux 15min

---

## 🚀 **DÉPLOIEMENT**

### **Prérequis**

1. **Base de données** : Tables `booking_exceptions` et `booking_slots` avec RLS
2. **Realtime** : Activation pour la table `booking_exceptions`
3. **Dépendances** : FullCalendar, TanStack Query, Sonner

### **Configuration**

1. **URLs** : Vérifier les routes dans Next.js
2. **Hooks** : Vérifier les imports des hooks
3. **Types** : Vérifier la compatibilité TypeScript
4. **Services** : Vérifier que les `booking_slots` sont configurés

---

## 📝 **NOTES IMPORTANTES**

### **Corrections TypeScript**

- **Gestion des nulls** : Toutes les propriétés peuvent être `null`
- **FullCalendar** : Ne pas passer de valeurs `null` pour `start`/`end`
- **Next.js 15** : Utiliser `React.use(params)` pour les paramètres

### **Optimisations**

- **Périodes** : Ajouter un jour à la date de fin pour l'affichage inclusif
- **Filtrage** : Filtrer les événements `null` avant de les passer à FullCalendar
- **Performance** : Nettoyage automatique des channels realtime
- **Services** : Filtrage par `day_of_week` et `is_active`

### **Nouvelles Fonctionnalités**

- **Services dynamiques** : Récupération depuis `booking_slots` selon la date
- **Créneaux dynamiques** : Génération automatique des créneaux 15min
- **Validation intelligente** : Vérification de la disponibilité des services
- **Messages informatifs** : Feedback utilisateur pour les services non configurés

---

**Date de Création** : $(date)
**Version** : 2.0
**Statut** : ✅ Production Ready avec Services Dynamiques
