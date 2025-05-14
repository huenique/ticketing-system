import { LogOut, LucideIcon, Settings, Ticket, User, Users, Package, Check, X } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sidebarService, SidebarSettings } from "@/services/sidebarService";
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
          isActive 
            ? "bg-neutral-900 text-white hover:bg-neutral-800" 
            : "text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900",
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
  const [sidebarTitle, setSidebarTitle] = useState("Ticketing System");
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [settings, setSettings] = useState<SidebarSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Base navigation items for all users
  const baseNavItems = [{ title: "Tickets", icon: Ticket, href: "/tickets" }];

  // Admin-only items
  const adminNavItems = [
    { title: "Users", icon: User, href: "/users" },
    { title: "User Types", icon: User, href: "/user-types" },
    { title: "Customers", icon: Users, href: "/customers" },
    { title: "Parts", icon: Package, href: "/parts" },
    { title: "Settings", icon: Settings, href: "/settings" },
  ];

  // Combine navigation items based on user permissions
  const navItems = hasPermission("admin")
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;

  // Fetch sidebar title when component mounts
  useEffect(() => {
    async function loadSidebarSettings() {
      try {
        setIsLoading(true);
        const sidebarSettings = await sidebarService.getSidebarSettings();
        if (sidebarSettings) {
          setSidebarTitle(sidebarSettings.title);
          setSettings(sidebarSettings);
        }
      } catch (error) {
        console.error("Failed to load sidebar settings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSidebarSettings();
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleTitleClick = () => {
    if (hasPermission("admin")) {
      setTempTitle(sidebarTitle);
      setIsEditing(true);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempTitle(e.target.value);
  };

  const handleSave = useCallback(async () => {
    if (!settings) return;
    
    try {
      await sidebarService.updateSidebarTitle(settings.$id, tempTitle);
      setSidebarTitle(tempTitle);
      setIsEditing(false);
      toast.success("Title updated successfully");
    } catch (error) {
      console.error("Failed to update title:", error);
      toast.error("Failed to update title");
    }
  }, [settings, tempTitle]);

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Handle clicks outside the input to save
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        handleSave();
      }
    }

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, handleSave]);

  return (
    <div
      className={cn(
        "flex h-screen w-60 flex-col border-r bg-white px-3 py-4",
        className,
      )}
    >
      <div className="mb-6 px-2">
        {isLoading ? (
          <div className="h-7 w-48 bg-gray-200 animate-pulse rounded"></div>
        ) : isEditing ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={tempTitle}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              className="text-xl font-bold bg-gray-100 px-1 py-0.5 rounded border border-gray-300 focus:outline-none focus:border-blue-500 w-full"
            />
            <button 
              onClick={handleSave} 
              className="p-1 text-green-600 hover:text-green-800"
              title="Save"
            >
              <Check size={16} />
            </button>
            <button 
              onClick={handleCancel} 
              className="p-1 text-red-600 hover:text-red-800"
              title="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <h1 
            className={cn(
              "text-xl font-bold",
              hasPermission("admin") && "cursor-pointer hover:text-blue-600"
            )}
            onClick={handleTitleClick}
            title={hasPermission("admin") ? "Click to edit" : ""}
          >
            {sidebarTitle}
          </h1>
        )}
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
