'use client';

import { useGetUserHistoryQuery } from '@/store/api/organizationApi';
import { useGetUserByIdQuery } from '@/store/api/userApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import {
  Calendar,
  Building2,
  Briefcase,
  Clock,
  User,
  FileText,
  UserCheck,
} from 'lucide-react';

interface UserPositionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfileId: string;
}

export function UserPositionHistoryDialog({
  open,
  onOpenChange,
  userProfileId,
}: UserPositionHistoryDialogProps) {
  const { data: history, isLoading: isLoadingHistory } = useGetUserHistoryQuery(userProfileId, {
    skip: !open,
  });
  const { data: user, isLoading: isLoadingUser } = useGetUserByIdQuery(userProfileId, {
    skip: !open,
  });

  const isLoading = isLoadingHistory || isLoadingUser;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Position History
          </DialogTitle>
          <DialogDescription>
            {user ? `${user.name || user.email}'s complete position history` : 'Loading user information...'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((position, index) => (
                <div
                  key={position.id}
                  className={`relative border rounded-lg p-4 ${
                    position.isActive ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  {/* Timeline connector */}
                  {index < history.length - 1 && (
                    <div className="absolute left-6 top-full h-4 w-0.5 bg-border" />
                  )}

                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-semibold">{position.positionName}</h4>
                        {position.isPlt && (
                          <Badge variant="secondary" className="text-xs">
                            PLT
                          </Badge>
                        )}
                        {position.isActive && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>

                      {position.departmentName && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {position.departmentName}
                        </div>
                      )}

                      {position.schoolName && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {position.schoolName}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {format(new Date(position.startDate), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <span className="text-muted-foreground">→</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {position.endDate
                              ? format(new Date(position.endDate), 'dd MMM yyyy')
                              : 'Present'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Duration: {position.duration}</span>
                      </div>

                      {position.skNumber && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>SK: {position.skNumber}</span>
                        </div>
                      )}

                      {position.appointedBy && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <UserCheck className="h-3 w-3" />
                          <span>Appointed by: {position.appointedBy}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No position history found</p>
              <p className="text-sm mt-2">This user has not been assigned to any positions yet.</p>
            </div>
          )}
        </ScrollArea>

        {history && history.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Total positions: {history.length}</span>
              <span>
                Active positions: {history.filter(p => p.isActive).length}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}