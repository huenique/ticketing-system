import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordService } from "@/services/passwordService";

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName: string;
  authUserId: string;
}

export function ChangePasswordDialog({
  isOpen,
  onClose,
  userEmail,
  userName,
  authUserId,
}: ChangePasswordDialogProps) {
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = (field: "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setIsChangingPassword(true);
      
      // Call the password service to update the user's password using admin privileges
      await passwordService.updateUserPassword(authUserId, formData.newPassword);
      
      toast.success("Password changed successfully");
      setFormData({
        newPassword: "",
        confirmPassword: "",
      });
      onClose();
    } catch (error: any) {
      console.error("Error changing password:", error);
      
      // Handle specific error messages from the password service
      toast.error(error.message || "Failed to change password. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleClose = () => {
    setFormData({
      newPassword: "",
      confirmPassword: "",
    });
    setShowPasswords({
      new: false,
      confirm: false,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Change the password for <strong>{userName}</strong> ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Admin Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>Admin Action:</strong> You are changing the password for this user using administrative privileges. No current password verification is required.
            </p>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password (min. 8 characters)"
                required
                minLength={8}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("new")}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm new password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirm")}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isChangingPassword}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 