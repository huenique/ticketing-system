import { LogOut, LucideIcon, Settings, Ticket, User, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useUserStore from "@/stores/userStore";

interface SidebarItemProps {
  icon: LucideIcon;
  title: string;
  isActive?: boolean;
  href: string;
}

function SidebarItem({ icon: Icon, title, href }: SidebarItemProps) {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <Link to={href} className="flex">
      <Button
        variant={isActive ? "default" : "ghost"}
        className={cn(
          "w-full justify-start gap-2",
          isActive ? "bg-neutral-900 text-white" : "text-neutral-600",
        )}
      >
        <Icon size={18} />
        <span>{title}</span>
      </Button>
    </Link>
  );
}

interface SidebarProps {
  className?: string;
}

function Sidebar({ className }: SidebarProps) {
  const { currentUser, hasPermission } = useUserStore();

  // Base navigation items for all users
  const baseNavItems = [{ title: "Tickets", icon: Ticket, href: "/tickets" }];

  // Admin-only items
  const adminNavItems = [
    { title: "Users", icon: User, href: "/users" },
    { title: "Customers", icon: Users, href: "/customers" },
    { title: "Settings", icon: Settings, href: "/settings" },
  ];

  // Combine navigation items based on user permissions
  const navItems = hasPermission("admin")
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;

  return (
    <div
      className={cn(
        "flex h-screen w-60 flex-col border-r bg-white px-3 py-4",
        className,
      )}
    >
      <div className="mb-6 px-2">
        <h1 className="text-xl font-bold">Ticketing System</h1>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <SidebarItem key={item.href} {...item} />
        ))}
      </div>

      <div className="mt-auto border-t pt-4">
        {/* User Account Indicator */}
        {currentUser && (
          <div className="mb-2 flex items-center gap-3 px-3 py-2 rounded-md bg-neutral-50">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
                  {currentUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{currentUser.name}</div>
              <div className="text-xs text-neutral-500 truncate">
                <span className="capitalize">{currentUser.role}</span>
              </div>
            </div>
          </div>
        )}
        <SidebarItem icon={LogOut} title="Logout" href="/logout" />
      </div>
    </div>
  );
}

export { Sidebar };
