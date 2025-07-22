"use client";

import { useState, useEffect } from "react";
import { Bell, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealtimeNotifications } from "@/hooks/use-realtime";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslations } from "next-intl";

export function NotificationsCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useRealtimeNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("common");

  // Fermer le menu après avoir cliqué sur une notification
  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
    setIsOpen(false);
  };

  // Marquer toutes comme lues
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  // Effacer toutes les notifications
  const handleClearAll = () => {
    clearNotifications();
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-6 px-2 text-xs">
                <Check className="mr-1 h-3 w-3" />
                Tout marquer comme lu
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-6 px-2 text-xs text-red-600">
                <Trash2 className="mr-1 h-3 w-3" />
                Effacer tout
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="h-64">
          {notifications.length === 0 ? (
            <div className="text-muted-foreground flex items-center justify-center py-8">
              <div className="text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">Aucune notification</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id)}
                  className={`flex cursor-pointer flex-col items-start p-3 ${!notification.read ? "bg-muted/50" : ""}`}
                >
                  <div className="flex w-full items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-medium">{notification.title}</span>
                        {!notification.read && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                      </div>
                      <p className="text-muted-foreground mb-1 text-xs">{notification.message}</p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(notification.timestamp), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
