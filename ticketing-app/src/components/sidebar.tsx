import { Home, LogOut,LucideIcon, Settings, Ticket, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const navItems = [
    { title: "Tickets", icon: Ticket, href: "/tickets" },
    { title: "Users", icon: Users, href: "/users" },
    { title: "Settings", icon: Settings, href: "/settings" },
  ];

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
        <SidebarItem icon={LogOut} title="Logout" href="/logout" />
      </div>
    </div>
  );
}

export { Sidebar };
