import { Save, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Checkbox } from '@/shared/ui/checkbox';
import { Separator } from '@/shared/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import type { Role, Permission } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface RolesPermissionsProps {
    roles: Role[];
    permissions: Record<string, Permission>;
    onPermissionUpdate: (key: string, field: keyof Permission, value: boolean) => void;
    onAddRole: () => void;
}

export function RolesPermissionsSection({
    roles,
    permissions,
    onPermissionUpdate,
    onAddRole,
}: RolesPermissionsProps) {
    const { t } = useI18n();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{t('admin.systemSettings.roles.title')}</CardTitle>
                        <CardDescription>{t('admin.systemSettings.roles.description')}</CardDescription>
                    </div>
                    <Button onClick={onAddRole}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('admin.systemSettings.roles.addRole')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Current Roles */}
                <div>
                    <h4 className="mb-3">{t('admin.systemSettings.roles.currentRoles')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {roles.map((role) => (
                            <Card key={role.id} className="border-2">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <h4>{role.name}</h4>
                                        <Badge variant="secondary">
                                            {t('admin.systemSettings.roles.usersCount', { count: role.userCount })}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">{role.description}</p>
                                    <Button variant="outline" size="sm" className="w-full">
                                        {t('admin.systemSettings.roles.editPermissions')}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <Separator />

                {/* Permission Matrix */}
                <div>
                    <h4 className="mb-3">{t('admin.systemSettings.roles.adminPermissions')}</h4>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.systemSettings.roles.table.module')}</TableHead>
                                    <TableHead className="text-center">{t('common.view')}</TableHead>
                                    <TableHead className="text-center">{t('common.create')}</TableHead>
                                    <TableHead className="text-center">{t('common.edit')}</TableHead>
                                    <TableHead className="text-center">{t('common.delete')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(permissions).map(([key, perm]) => (
                                    <TableRow key={key}>
                                        <TableCell className="font-medium">
                                            {t(`admin.systemSettings.roles.modules.${key}`, perm.module)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={perm.view}
                                                onCheckedChange={(checked: boolean) => onPermissionUpdate(key, 'view', checked)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={perm.create}
                                                onCheckedChange={(checked: boolean) => onPermissionUpdate(key, 'create', checked)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={perm.edit}
                                                onCheckedChange={(checked: boolean) => onPermissionUpdate(key, 'edit', checked)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={perm.delete}
                                                onCheckedChange={(checked: boolean) => onPermissionUpdate(key, 'delete', checked)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button>
                        <Save className="w-4 h-4 mr-2" />
                        {t('admin.systemSettings.roles.savePermissions')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
