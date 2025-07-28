import React from "react";

import { User, AlertCircle, Check } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfGuests: number;
  specialRequests: string;
}

interface BookingFormProps {
  formData: BookingFormData;
  setFormData: (data: BookingFormData) => void;
  error: string;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

// Composant pour le formulaire de réservation
export function BookingForm({ formData, setFormData, error, submitting, onSubmit }: BookingFormProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="text-primary h-5 w-5" />
          Vos informations
        </CardTitle>
        <CardDescription>Remplissez vos informations pour confirmer votre réservation</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Informations personnelles */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Votre prénom"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Votre nom"
                required
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="votre@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="06 12 34 56 78"
                required
              />
            </div>
          </div>

          {/* Nombre de personnes */}
          <div className="space-y-2">
            <Label htmlFor="numberOfGuests">Nombre de personnes *</Label>
            <Select
              value={formData.numberOfGuests.toString()}
              onValueChange={(value) => setFormData({ ...formData, numberOfGuests: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le nombre de personnes" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? "personne" : "personnes"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Demandes spéciales */}
          <div className="space-y-2">
            <Label htmlFor="specialRequests">Demandes spéciales</Label>
            <Textarea
              id="specialRequests"
              value={formData.specialRequests}
              onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
              placeholder="Allergies, préférences alimentaires, demandes particulières..."
              rows={3}
            />
          </div>

          {/* Bouton de soumission */}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Confirmation en cours...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirmer ma réservation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
