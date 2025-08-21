'use client';

import { useState } from 'react';
import { UserCheck, Search, Loader2, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useGetImpersonatableUsersQuery,
  useStartImpersonationMutation,
  useGetImpersonationSessionQuery,
} from '@/store/api/impersonationApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImpersonationDropdownProps {
  currentUserEmail?: string;
  isSuperAdmin: boolean;
}

export function ImpersonationDropdown({ currentUserEmail, isSuperAdmin }: ImpersonationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: session, error: sessionError } = useGetImpersonationSessionQuery();
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useGetImpersonatableUsersQuery(
    { search: searchTerm, limit: 20 },
    { skip: !isOpen || !isSuperAdmin }
  );
  const [startImpersonation, { isLoading: isStarting }] = useStartImpersonationMutation();

  // Check if API is available (not 404)
  const isApiNotImplemented = (sessionError as any)?.status === 404 || (usersError as any)?.status === 404;

  // Don't show if not superadmin, already impersonating, or API not available
  if (!isSuperAdmin || session?.isActive || isApiNotImplemented) {
    return null;
  }

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setIsConfirmOpen(true);
  };

  const handleStartImpersonation = async () => {
    if (!selectedUser) return;

    try {
      await startImpersonation({
        targetUserId: selectedUser.id,
        reason: reason.trim() || undefined,
      }).unwrap();
      
      toast.success(`Now impersonating ${selectedUser.name || selectedUser.email}`);
      setIsConfirmOpen(false);
      setIsOpen(false);
      setSelectedUser(null);
      setReason('');
      
      // Reload the page to refresh the session
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to start impersonation');
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || '??';
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2"
            title="Impersonate User"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden md:inline">Impersonate</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[320px]">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Select User to Impersonate
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          <ScrollArea className="h-[300px]">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users && users.length > 0 ? (
              <div className="px-2 pb-2">
                {users.map((user) => (
                  <DropdownMenuItem
                    key={user.id}
                    className="cursor-pointer p-2 mb-1"
                    onSelect={() => handleSelectUser(user)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {user.name || 'No name'}
                          </span>
                          {user.organizationRole && (
                            <Badge variant="outline" className="text-xs">
                              {user.organizationRole}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate block">
                          {user.email}
                        </span>
                      </div>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {searchTerm ? 'No users found' : 'Start typing to search users'}
              </div>
            )}
          </ScrollArea>
          
          {currentUserEmail === 'christian_handoko@gloriaschool.org' && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Badge variant="secondary" className="text-xs w-full justify-center">
                  Superadmin Mode
                </Badge>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Impersonation</DialogTitle>
            <DialogDescription>
              You are about to impersonate another user. This action will be logged for security purposes.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.profileImageUrl} />
                  <AvatarFallback>
                    {getInitials(selectedUser.name, selectedUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{selectedUser.name || 'No name'}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  {selectedUser.organizationRole && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {selectedUser.organizationRole}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Impersonation (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Debugging user-reported issue, Testing permissions..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              
              <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> Your session will last for 1 hour. All actions will be logged with your original identity.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isStarting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartImpersonation}
              disabled={isStarting}
              className="gap-2"
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  Start Impersonation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Add missing import
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';