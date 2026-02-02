import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  User,
  Users,
  Bell,
  Shield,
  Database,
  Building2,
  Mail,
  Check,
  ExternalLink,
  AlertTriangle,
  Save,
  Loader2,
  MoreHorizontal,
  Pencil,
  Lock,
  Unlock,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore, type UserRole } from '@/store/authStore';
import { useSettingsStore } from '@/store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface SettingsProps {
  onNavigate: (route: 'landing' | 'dashboard' | 'briefing' | 'scout' | 'library' | 'settings') => void;
  currentRoute: string;
}

type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  company?: string;
  industry?: string;
  role: UserRole;
  is_locked: boolean;
};

export default function Settings({ onNavigate }: SettingsProps) {
  const { user, updateUser, listUsersForAdmin, updateUserProfileAsAdmin, requestPasswordReset } = useAuthStore();
  const { settings, updateSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: user?.company || '',
    industry: user?.industry || '',
  });

  // Admin users tab
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', company: '', industry: '' });
  const [userActionMessage, setUserActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setProfileForm({ name: user?.name || '', email: user?.email || '', company: user?.company || '', industry: user?.industry || '' });
  }, [user]);

  useEffect(() => {
    if (activeTab === 'users' && user?.role === 'admin') {
      setUsersLoading(true);
      listUsersForAdmin().then((list) => {
        setAdminUsers(list);
        setUsersLoading(false);
      });
    }
  }, [activeTab, user?.role]);

  useEffect(() => {
    if (editUser) {
      setEditForm({
        name: editUser.name,
        company: editUser.company ?? '',
        industry: editUser.industry ?? '',
      });
    }
  }, [editUser]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !user) return;
    supabase.from('user_settings').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        updateSettings({
          emailNotifications: data.email_notifications ?? true,
          notificationFrequency: (data.notification_frequency as 'immediate' | 'daily' | 'weekly') ?? 'daily',
          theme: (data.theme as 'dark' | 'light' | 'system') ?? 'dark',
          defaultIndustry: data.default_industry ?? '',
        });
      }
    });
  }, [user?.id]);

  const handleSettingsChange = (updates: Parameters<typeof updateSettings>[0]) => {
    const merged = { ...settings, ...updates };
    updateSettings(updates);
    if (isSupabaseConfigured() && user) {
      supabase.from('user_settings').upsert({
        user_id: user.id,
        email_notifications: merged.emailNotifications,
        notification_frequency: merged.notificationFrequency,
        theme: merged.theme,
        default_industry: merged.defaultIndustry,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }).then(() => {});
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    updateUser(profileForm);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-16 lg:w-64 border-r border-border bg-sidebar flex-shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime to-lime-light flex items-center justify-center">
              <span className="text-background font-bold">PS</span>
            </div>
            <span className="font-semibold text-lg hidden lg:block">PainScope AI</span>
          </button>
        </div>
        <nav className="p-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <span className="text-sm hidden lg:block">← Back to Dashboard</span>
            <span className="lg:hidden">←</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-lime" />
            </div>
            <div>
              <h1 className="font-semibold">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>
        </header>

        {/* Settings Content */}
        <div className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl">
            <TabsList className="mb-6">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="integrations" className="gap-2">
                <Building2 className="w-4 h-4" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
              {user?.role === 'admin' && (
                <TabsTrigger value="users" className="gap-2">
                  <Users className="w-4 h-4" />
                  Users
                </TabsTrigger>
              )}
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-6"
              >
                <h2 className="text-lg font-semibold mb-6">Profile Information</h2>

                {/* Avatar */}
                <div className="flex items-center gap-6 mb-8">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-lime/20 text-lime text-2xl">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm">
                      Change Avatar
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="john@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={profileForm.company}
                      onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                      placeholder="Acme Inc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry Focus</Label>
                    <Input
                      id="industry"
                      value={profileForm.industry}
                      onChange={(e) => setProfileForm({ ...profileForm, industry: e.target.value })}
                      placeholder="Fintech, SaaS, etc."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 mt-8">
                  {saveSuccess && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 text-green-400"
                    >
                      <Check className="w-4 h-4" />
                      <span className="text-sm">Saved successfully</span>
                    </motion.div>
                  )}
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-lime text-background hover:bg-lime-light"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </motion.div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-6"
              >
                <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>

                <div className="space-y-6">
                  {/* Email Notifications */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-lime" />
                      </div>
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">
                          Receive email updates about new pain discoveries
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => handleSettingsChange({ emailNotifications: checked })}
                    />
                  </div>

                  {/* Frequency */}
                  {settings.emailNotifications && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="ml-14 space-y-3"
                    >
                      <p className="text-sm font-medium">Notification Frequency</p>
                      <div className="flex gap-3">
                        {(['immediate', 'daily', 'weekly'] as const).map((freq) => (
                          <button
                            key={freq}
                            onClick={() => handleSettingsChange({ notificationFrequency: freq })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              settings.notificationFrequency === freq
                                ? 'bg-lime text-background'
                                : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <Separator />

                  {/* Discovery Alerts */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">High-Priority Alerts</p>
                        <p className="text-sm text-muted-foreground">
                          Get notified when PainScore exceeds 80
                        </p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  {/* Weekly Summary */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Database className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium">Weekly Summary</p>
                        <p className="text-sm text-muted-foreground">
                          Receive a weekly digest of all discoveries
                        </p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-6"
              >
                <h2 className="text-lg font-semibold mb-6">CRM Integrations</h2>
                <p className="text-muted-foreground mb-6">
                  Connect your CRM to push pain discoveries directly to your sales pipeline.
                </p>

                <div className="space-y-4">
                  {/* Salesforce */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-transparent hover:border-lime/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">Salesforce</p>
                        <p className="text-sm text-muted-foreground">Connect to push opportunities</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Connect
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  {/* HubSpot */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-transparent hover:border-lime/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium">HubSpot</p>
                        <p className="text-sm text-muted-foreground">Sync with your CRM</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Connect
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  {/* Pipedrive */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-transparent hover:border-lime/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">Pipedrive</p>
                        <p className="text-sm text-muted-foreground">Add deals to your pipeline</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Connect
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-6"
              >
                <h2 className="text-lg font-semibold mb-6">Security Settings</h2>

                <div className="space-y-6">
                  {/* Password */}
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-muted-foreground">
                          Last changed 3 months ago
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Change Password
                      </Button>
                    </div>
                  </div>

                  {/* Two-Factor Auth */}
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-muted-foreground">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                      </div>
                      <Switch />
                    </div>
                  </div>

                  {/* API Keys */}
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">API Keys</p>
                        <p className="text-sm text-muted-foreground">
                          Manage your API access tokens
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Manage Keys
                      </Button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-red-400">Danger Zone</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Once you delete your account, there is no going back.
                        </p>
                        <Button variant="destructive" size="sm">
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Users Tab (Admin only) */}
            {user?.role === 'admin' && (
              <TabsContent value="users" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-6"
                >
                  <h2 className="text-lg font-semibold mb-4">User Management</h2>
                  {userActionMessage && (
                    <div
                      className={`mb-4 px-4 py-2 rounded-lg text-sm ${userActionMessage.type === 'success' ? 'bg-lime/20 text-lime' : 'bg-red-500/20 text-red-400'}`}
                    >
                      {userActionMessage.text}
                    </div>
                  )}
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-lime" />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adminUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                No users found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            adminUsers.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{row.name}</TableCell>
                              <TableCell>{row.email}</TableCell>
                              <TableCell>
                                <Select
                                  value={row.role}
                                  onValueChange={async (value: UserRole) => {
                                    const res = await updateUserProfileAsAdmin(row.id, { role: value });
                                    if (res.success) {
                                      setAdminUsers((prev) => prev.map((u) => (u.id === row.id ? { ...u, role: value } : u)));
                                      setUserActionMessage({ type: 'success', text: 'Role updated' });
                                      setTimeout(() => setUserActionMessage(null), 3000);
                                    } else {
                                      setUserActionMessage({ type: 'error', text: res.error ?? 'Failed' });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-[100px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <span className={row.is_locked ? 'text-red-400' : 'text-lime'}>
                                  {row.is_locked ? 'Locked' : 'Active'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditUser(row)}>
                                      <Pencil className="w-4 h-4 mr-2" />
                                      Edit user
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={async () => {
                                        const res = await updateUserProfileAsAdmin(row.id, { is_locked: !row.is_locked });
                                        if (res.success) {
                                          setAdminUsers((prev) => prev.map((u) => (u.id === row.id ? { ...u, is_locked: !u.is_locked } : u)));
                                          setUserActionMessage({ type: 'success', text: row.is_locked ? 'Account unlocked' : 'Account locked' });
                                          setTimeout(() => setUserActionMessage(null), 3000);
                                        } else {
                                          setUserActionMessage({ type: 'error', text: res.error ?? 'Failed' });
                                        }
                                      }}
                                    >
                                      {row.is_locked ? (
                                        <>
                                          <Unlock className="w-4 h-4 mr-2" />
                                          Unlock account
                                        </>
                                      ) : (
                                        <>
                                          <Lock className="w-4 h-4 mr-2" />
                                          Lock account
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    {isSupabaseConfigured() && (
                                      <DropdownMenuItem
                                        onClick={async () => {
                                          const res = await requestPasswordReset(row.email);
                                          setUserActionMessage({
                                            type: res.success ? 'success' : 'error',
                                            text: res.success ? 'Password reset email sent' : (res.error ?? 'Failed'),
                                          });
                                          setTimeout(() => setUserActionMessage(null), 4000);
                                        }}
                                      >
                                        <KeyRound className="w-4 h-4 mr-2" />
                                        Send password reset
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            )}

            {/* Edit User Dialog */}
            <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit user</DialogTitle>
                </DialogHeader>
                {editUser && (
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Name</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={editUser.email} disabled className="opacity-70" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-company">Company</Label>
                      <Input
                        id="edit-company"
                        value={editForm.company}
                        onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-industry">Industry</Label>
                      <Input
                        id="edit-industry"
                        value={editForm.industry}
                        onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setEditUser(null)}>
                        Cancel
                      </Button>
                      <Button
                        className="bg-lime text-background hover:bg-lime-light"
                        onClick={async () => {
                          if (!editUser) return;
                          const res = await updateUserProfileAsAdmin(editUser.id, {
                            name: editForm.name,
                            company: editForm.company || undefined,
                            industry: editForm.industry || undefined,
                          });
                          if (res.success) {
                            setAdminUsers((prev) =>
                              prev.map((u) =>
                                u.id === editUser.id
                                  ? { ...u, name: editForm.name, company: editForm.company, industry: editForm.industry }
                                  : u
                              )
                            );
                            setEditUser(null);
                            setUserActionMessage({ type: 'success', text: 'User updated' });
                            setTimeout(() => setUserActionMessage(null), 3000);
                          } else {
                            setUserActionMessage({ type: 'error', text: res.error ?? 'Failed' });
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
