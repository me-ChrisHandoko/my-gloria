'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GitBranch,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Network,
  Info,
} from 'lucide-react';
import {
  useGetPositionsQuery,
  useSetHierarchyMutation,
  useGetReportingChainQuery,
  useGetSubordinatesQuery,
  useValidateHierarchyMutation,
  useGetPositionHierarchyQuery,
} from '@/store/api/organizationApi';
import { Position } from '@/types/organization';

const hierarchySchema = z.object({
  positionId: z.string().min(1, 'Please select a position'),
  reportsToId: z.string().optional(),
  coordinatorId: z.string().optional(),
}).refine((data) => {
  if (data.reportsToId && data.reportsToId === data.positionId) {
    return false;
  }
  if (data.coordinatorId && data.coordinatorId === data.positionId) {
    return false;
  }
  return true;
}, {
  message: "A position cannot report to or be coordinated by itself",
  path: ["reportsToId"],
});

type FormData = z.infer<typeof hierarchySchema>;

export function HierarchyManagement() {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [reportingChainOpen, setReportingChainOpen] = useState(false);
  const [subordinatesOpen, setSubordinatesOpen] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);

  const { data: positions, isLoading: isLoadingPositions } = useGetPositionsQuery({
    isActive: true,
  });
  const [setHierarchy, { isLoading: isSettingHierarchy }] = useSetHierarchyMutation();
  const [validateHierarchy, { isLoading: isValidating }] = useValidateHierarchyMutation();

  const { data: positionHierarchy } = useGetPositionHierarchyQuery(selectedPosition!, {
    skip: !selectedPosition,
  });

  const { data: reportingChain } = useGetReportingChainQuery(selectedPosition!, {
    skip: !selectedPosition || !reportingChainOpen,
  });

  const { data: subordinates } = useGetSubordinatesQuery(selectedPosition!, {
    skip: !selectedPosition || !subordinatesOpen,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(hierarchySchema),
    defaultValues: {
      positionId: '',
      reportsToId: '',
      coordinatorId: '',
    },
  });

  const handlePositionSelect = (positionId: string) => {
    setSelectedPosition(positionId);
    form.setValue('positionId', positionId);
    
    // Load current hierarchy if exists
    if (positionHierarchy) {
      form.setValue('reportsToId', positionHierarchy.reportsToId || '');
      form.setValue('coordinatorId', positionHierarchy.coordinatorId || '');
    }
  };

  const handleSubmit = async (data: FormData) => {
    try {
      await setHierarchy({
        positionId: data.positionId,
        reportsToId: data.reportsToId || undefined,
        coordinatorId: data.coordinatorId || undefined,
      }).unwrap();
      
      toast.success('Hierarchy updated successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update hierarchy');
    }
  };

  const handleValidate = async () => {
    try {
      const result = await validateHierarchy().unwrap();
      setValidationResults(result);
      
      if (result.valid) {
        toast.success('Hierarchy validation passed');
      } else {
        toast.warning(`Hierarchy validation found ${result.issues.length} issues`);
      }
    } catch (error: any) {
      toast.error('Failed to validate hierarchy');
    }
  };

  const selectedPositionData = positions?.find(p => p.id === selectedPosition);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Hierarchy Management
          </CardTitle>
          <CardDescription>
            Configure reporting relationships and organizational structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="configure" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="configure">Configure</TabsTrigger>
              <TabsTrigger value="view">View Structure</TabsTrigger>
              <TabsTrigger value="validate">Validate</TabsTrigger>
            </TabsList>

            <TabsContent value="configure" className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="positionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <Select
                          disabled={isLoadingPositions}
                          onValueChange={(value) => {
                            field.onChange(value);
                            handlePositionSelect(value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a position to configure" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {positions?.map((position) => (
                              <SelectItem key={position.id} value={position.id}>
                                {position.name}
                                {position.department && ` - ${position.department.name}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the position to set hierarchy for
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedPosition && (
                    <>
                      <FormField
                        control={form.control}
                        name="reportsToId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reports To</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select reporting manager (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {positions
                                  ?.filter(p => p.id !== selectedPosition)
                                  .map((position) => (
                                    <SelectItem key={position.id} value={position.id}>
                                      {position.name}
                                      {position.department && ` - ${position.department.name}`}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The position this role reports to in the hierarchy
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="coordinatorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Coordinator</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select coordinator (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {positions
                                  ?.filter(p => p.id !== selectedPosition)
                                  .map((position) => (
                                    <SelectItem key={position.id} value={position.id}>
                                      {position.name}
                                      {position.department && ` - ${position.department.name}`}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              A coordinator who provides guidance without direct reporting
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2">
                        <Button type="submit" disabled={isSettingHierarchy}>
                          {isSettingHierarchy ? 'Updating...' : 'Update Hierarchy'}
                        </Button>
                        
                        {selectedPositionData && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setReportingChainOpen(true)}
                            >
                              <ArrowUp className="h-4 w-4 mr-2" />
                              View Reporting Chain
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setSubordinatesOpen(true)}
                            >
                              <ArrowDown className="h-4 w-4 mr-2" />
                              View Subordinates
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="view" className="space-y-4">
              {selectedPosition && positionHierarchy ? (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold mb-2">Current Position</h4>
                    <p className="text-lg">{selectedPositionData?.name}</p>
                    {selectedPositionData?.department && (
                      <p className="text-sm text-muted-foreground">
                        {selectedPositionData.department.name}
                      </p>
                    )}
                  </div>

                  {positionHierarchy.reportsTo && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <ArrowUp className="h-4 w-4" />
                        Reports To
                      </h4>
                      <p>{positionHierarchy.reportsTo.positionName}</p>
                      {positionHierarchy.reportsTo.holderName && (
                        <p className="text-sm text-muted-foreground">
                          Currently held by: {positionHierarchy.reportsTo.holderName}
                        </p>
                      )}
                    </div>
                  )}

                  {positionHierarchy.coordinator && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Coordinator
                      </h4>
                      <p>{positionHierarchy.coordinator.positionName}</p>
                      {positionHierarchy.coordinator.holderName && (
                        <p className="text-sm text-muted-foreground">
                          Currently held by: {positionHierarchy.coordinator.holderName}
                        </p>
                      )}
                    </div>
                  )}

                  {positionHierarchy.directReports && positionHierarchy.directReports.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <ArrowDown className="h-4 w-4" />
                        Direct Reports ({positionHierarchy.directReports.length})
                      </h4>
                      <div className="space-y-2">
                        {positionHierarchy.directReports.map((report: any) => (
                          <div key={report.positionId} className="text-sm">
                            <p>{report.positionName}</p>
                            {report.currentHolder && (
                              <p className="text-xs text-muted-foreground">
                                {report.currentHolder.name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Select a position from the Configure tab to view its hierarchy
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="validate" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Check for circular references, orphaned positions, and other hierarchy issues
                </p>
                <Button
                  onClick={handleValidate}
                  disabled={isValidating}
                  variant="outline"
                >
                  {isValidating ? 'Validating...' : 'Validate Hierarchy'}
                </Button>
              </div>

              {validationResults && (
                <div className="space-y-4">
                  <Alert variant={validationResults.valid ? 'default' : 'destructive'}>
                    <div className="flex items-center gap-2">
                      {validationResults.valid ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>
                        {validationResults.valid
                          ? 'Hierarchy validation passed successfully'
                          : `Found ${validationResults.issues.length} validation issues`}
                      </AlertDescription>
                    </div>
                  </Alert>

                  {!validationResults.valid && (
                    <>
                      {validationResults.circularReferences?.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Circular References</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {validationResults.circularReferences.map((ref: any) => (
                                <Alert key={ref.positionId} variant="destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    {ref.positionName} has circular reference with {ref.conflictWith}
                                  </AlertDescription>
                                </Alert>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {validationResults.orphanedPositions?.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Orphaned Positions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {validationResults.orphanedPositions.map((pos: any) => (
                                <Alert key={pos.positionId}>
                                  <Info className="h-4 w-4" />
                                  <AlertDescription>
                                    {pos.positionName}: {pos.reason}
                                  </AlertDescription>
                                </Alert>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Reporting Chain Dialog */}
      <Dialog open={reportingChainOpen} onOpenChange={setReportingChainOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reporting Chain</DialogTitle>
            <DialogDescription>
              Complete reporting hierarchy for {selectedPositionData?.name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            {reportingChain && (
              <div className="space-y-2">
                {reportingChain.reportingChain.map((level, index) => (
                  <div
                    key={`${level.positionId}-${index}`}
                    className="flex items-center gap-2"
                    style={{ marginLeft: `${level.level * 20}px` }}
                  >
                    <Badge variant="outline">Level {level.level}</Badge>
                    <div>
                      <p className="font-medium">{level.positionName}</p>
                      {level.departmentName && (
                        <p className="text-sm text-muted-foreground">
                          {level.departmentName}
                        </p>
                      )}
                      {level.holderName && (
                        <p className="text-sm text-muted-foreground">
                          {level.holderName}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Subordinates Dialog */}
      <Dialog open={subordinatesOpen} onOpenChange={setSubordinatesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subordinates</DialogTitle>
            <DialogDescription>
              All positions reporting to {selectedPositionData?.name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            {subordinates && subordinates.length > 0 ? (
              <div className="space-y-2">
                {subordinates.map((sub: any) => (
                  <div key={sub.positionId} className="rounded-lg border p-3">
                    <p className="font-medium">{sub.positionName}</p>
                    {sub.departmentName && (
                      <p className="text-sm text-muted-foreground">
                        {sub.departmentName}
                      </p>
                    )}
                    {sub.currentHolder && (
                      <p className="text-sm text-muted-foreground">
                        Held by: {sub.currentHolder.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No subordinates found for this position
                </AlertDescription>
              </Alert>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}