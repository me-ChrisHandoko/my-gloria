"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { useGetRolesQuery } from "@/lib/store/services/rolesApi";
import { useAssignRoleToUserMutation } from "@/lib/store/services/usersApi";
import { toast } from "sonner";

interface AssignRoleDialogProps {
  userId: string;
  assignedRoleIds?: string[];
}

export function AssignRoleDialog({ userId, assignedRoleIds = [] }: AssignRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  // Fetch available roles
  const { data: rolesData, isLoading: isLoadingRoles } = useGetRolesQuery();

  // Assign role mutation
  const [assignRole, { isLoading: isAssigning, error: assignError }] = useAssignRoleToUserMutation();

  // Filter out already assigned roles
  const availableRoles = rolesData?.data?.filter(
    (role) => !assignedRoleIds.includes(role.id)
  ) || [];

  const handleAssign = async () => {
    if (!selectedRoleId) return;

    // Get role name for toast message
    const selectedRole = availableRoles.find(r => r.id === selectedRoleId);
    const roleName = selectedRole?.name || "Role";

    try {
      await assignRole({
        userId,
        data: {
          role_id: selectedRoleId,
        },
      }).unwrap();

      toast.success(`Role "${roleName}" berhasil di-assign`);

      // Reset and close dialog
      setSelectedRoleId("");
      setOpen(false);
    } catch (err) {
      console.error("Failed to assign role:", err);
      toast.error("Gagal assign role");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Assign Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Role</DialogTitle>
          <DialogDescription>
            Pilih role yang ingin di-assign ke user ini
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {assignError && (
            <Alert variant="error">
              {(assignError as any)?.data?.error || "Gagal assign role"}
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            {isLoadingRoles ? (
              <div className="text-sm text-muted-foreground">Loading roles...</div>
            ) : availableRoles.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Semua role sudah di-assign
              </div>
            ) : (
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{role.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Level {role.hierarchy_level}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedRoleId || isAssigning}
          >
            {isAssigning ? "Assigning..." : "Assign Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
