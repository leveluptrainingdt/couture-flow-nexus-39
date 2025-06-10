
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, updateEmail } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { 
  User, 
  Store, 
  Bell, 
  Palette, 
  Shield, 
  Camera, 
  Upload,
  Save,
  Eye
} from 'lucide-react';

// Form schemas
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
});

const storeSchema = z.object({
  storeName: z.string().min(2, 'Store name is required'),
  storeAddress: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  openingHours: z.string().optional(),
});

const securitySchema = z.object({
  currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface UserSettings {
  profile: {
    name: string;
    phone: string;
    address: string;
    bio: string;
    profilePicture: string;
  };
  store: {
    storeName: string;
    storeLogo: string;
    storeAddress: string;
    gstin: string;
    pan: string;
    openingHours: string;
  };
  notifications: {
    emailAlerts: {
      newOrders: boolean;
      lowInventory: boolean;
      missedAppointments: boolean;
      staffCheckin: boolean;
      paymentReceived: boolean;
    };
    smsAlerts: boolean;
    dailySummary: boolean;
  };
  appearance: {
    theme: 'light' | 'dark';
    accentColor: string;
    fontPreference: string;
    compactMode: boolean;
    enableAnimations: boolean;
    language: string;
  };
}

const defaultSettings: UserSettings = {
  profile: {
    name: '',
    phone: '',
    address: '',
    bio: '',
    profilePicture: '',
  },
  store: {
    storeName: "Swetha's Couture",
    storeLogo: '',
    storeAddress: '',
    gstin: '',
    pan: '',
    openingHours: 'Mon-Sat: 9AM-7PM',
  },
  notifications: {
    emailAlerts: {
      newOrders: true,
      lowInventory: true,
      missedAppointments: true,
      staffCheckin: false,
      paymentReceived: true,
    },
    smsAlerts: false,
    dailySummary: true,
  },
  appearance: {
    theme: 'light',
    accentColor: '#8B5CF6',
    fontPreference: 'Inter',
    compactMode: false,
    enableAnimations: true,
    language: 'en',
  },
};

const Settings = () => {
  const { user, userData } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form instances
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: settings.profile,
  });

  const storeForm = useForm<z.infer<typeof storeSchema>>({
    resolver: zodResolver(storeSchema),
    defaultValues: settings.store,
  });

  const securityForm = useForm<z.infer<typeof securitySchema>>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      try {
        const settingsDoc = await getDoc(doc(db, 'userSettings', user.uid));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as UserSettings;
          setSettings({ ...defaultSettings, ...data });
          profileForm.reset(data.profile || defaultSettings.profile);
          storeForm.reset(data.store || defaultSettings.store);
        } else {
          // Set default name from userData
          const updatedSettings = {
            ...defaultSettings,
            profile: {
              ...defaultSettings.profile,
              name: userData?.name || '',
            }
          };
          setSettings(updatedSettings);
          profileForm.reset(updatedSettings.profile);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user, userData]);

  // Save settings to Firestore
  const saveSettings = async (section: keyof UserSettings, data: any) => {
    if (!user) return;

    try {
      const updatedSettings = {
        ...settings,
        [section]: { ...settings[section], ...data }
      };
      
      await setDoc(doc(db, 'userSettings', user.uid), updatedSettings, { merge: true });
      setSettings(updatedSettings);
      
      toast({
        title: "Settings Saved",
        description: `${section.charAt(0).toUpperCase() + section.slice(1)} settings updated successfully`,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  // Image upload to Cloudinary
  const uploadImage = async (file: File, folder: string) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default'); // You'll need to set this in Cloudinary
    formData.append('folder', folder);

    try {
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/your-cloud-name/image/upload', // Replace with your Cloudinary cloud name
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = await uploadImage(file, 'profile_pictures');
    if (imageUrl) {
      await saveSettings('profile', { profilePicture: imageUrl });
    }
  };

  // Handle store logo upload
  const handleStoreLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = await uploadImage(file, 'store_logos');
    if (imageUrl) {
      await saveSettings('store', { storeLogo: imageUrl });
    }
  };

  // Handle profile form submit
  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    await saveSettings('profile', data);
  };

  // Handle store form submit
  const onStoreSubmit = async (data: z.infer<typeof storeSchema>) => {
    await saveSettings('store', data);
  };

  // Handle security form submit
  const onSecuritySubmit = async (data: z.infer<typeof securitySchema>) => {
    if (!user || !auth.currentUser) return;

    try {
      await updatePassword(auth.currentUser, data.newPassword);
      securityForm.reset();
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    }
  };

  // Handle notification settings change
  const handleNotificationChange = (key: string, value: boolean, subKey?: string) => {
    const updatedNotifications = { ...settings.notifications };
    if (subKey) {
      (updatedNotifications.emailAlerts as any)[subKey] = value;
    } else {
      (updatedNotifications as any)[key] = value;
    }
    saveSettings('notifications', updatedNotifications);
  };

  // Handle appearance settings change
  const handleAppearanceChange = (key: string, value: any) => {
    const updatedAppearance = { ...settings.appearance, [key]: value };
    saveSettings('appearance', updatedAppearance);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account and system preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Store
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile picture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={settings.profile.profilePicture} />
                  <AvatarFallback className="text-lg">
                    {settings.profile.name.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="profile-picture" className="cursor-pointer">
                    <div className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
                      <Camera className="h-4 w-4" />
                      <span>Change Picture</span>
                    </div>
                  </Label>
                  <input
                    id="profile-picture"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureUpload}
                    disabled={uploading}
                  />
                  {settings.profile.profilePicture && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Profile Picture</DialogTitle>
                        </DialogHeader>
                        <img 
                          src={settings.profile.profilePicture} 
                          alt="Profile" 
                          className="w-full h-auto rounded-lg"
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              {/* Profile Form */}
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input value={user?.email || ''} disabled />
                    </FormControl>
                    <FormDescription>
                      Email cannot be changed here. Contact support if needed.
                    </FormDescription>
                  </FormItem>

                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter your address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Tell us about yourself" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Tab */}
        <TabsContent value="store" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>
                Manage your store details and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Store Logo */}
              <div className="space-y-4">
                <Label>Store Logo</Label>
                <div className="flex items-center space-x-4">
                  {settings.store.storeLogo && (
                    <img 
                      src={settings.store.storeLogo} 
                      alt="Store Logo" 
                      className="h-20 w-20 object-cover rounded-lg border"
                    />
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="store-logo" className="cursor-pointer">
                      <div className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
                        <Upload className="h-4 w-4" />
                        <span>Upload Logo</span>
                      </div>
                    </Label>
                    <input
                      id="store-logo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleStoreLogoUpload}
                      disabled={uploading}
                    />
                  </div>
                </div>
              </div>

              {/* Store Form */}
              <Form {...storeForm}>
                <form onSubmit={storeForm.handleSubmit(onStoreSubmit)} className="space-y-4">
                  <FormField
                    control={storeForm.control}
                    name="storeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter store name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={storeForm.control}
                    name="storeAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter store address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={storeForm.control}
                      name="gstin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GSTIN</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter GSTIN" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={storeForm.control}
                      name="pan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter PAN" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={storeForm.control}
                    name="openingHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Hours</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Mon-Sat: 9AM-7PM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Save Store Info
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about important events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Alerts</h3>
                
                <div className="space-y-3">
                  {Object.entries(settings.notifications.emailAlerts).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label htmlFor={key} className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </Label>
                      <Switch
                        id={key}
                        checked={value}
                        onCheckedChange={(checked) => handleNotificationChange('emailAlerts', checked, key)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Other Preferences</h3>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="smsAlerts">SMS Alerts</Label>
                  <Switch
                    id="smsAlerts"
                    checked={settings.notifications.smsAlerts}
                    onCheckedChange={(checked) => handleNotificationChange('smsAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="dailySummary">Daily Summary Email</Label>
                  <Switch
                    id="dailySummary"
                    checked={settings.notifications.dailySummary}
                    onCheckedChange={(checked) => handleNotificationChange('dailySummary', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the look and feel of your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={settings.appearance.theme}
                    onValueChange={(value) => handleAppearanceChange('theme', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="fontPreference">Font</Label>
                  <Select
                    value={settings.appearance.fontPreference}
                    onValueChange={(value) => handleAppearanceChange('fontPreference', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="compactMode">Compact Mode</Label>
                  <Switch
                    id="compactMode"
                    checked={settings.appearance.compactMode}
                    onCheckedChange={(checked) => handleAppearanceChange('compactMode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="enableAnimations">Enable Animations</Label>
                  <Switch
                    id="enableAnimations"
                    checked={settings.appearance.enableAnimations}
                    onCheckedChange={(checked) => handleAppearanceChange('enableAnimations', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={settings.appearance.language}
                    onValueChange={(value) => handleAppearanceChange('language', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="ta">Tamil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and privacy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-4">
                  <FormField
                    control={securityForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Update Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
