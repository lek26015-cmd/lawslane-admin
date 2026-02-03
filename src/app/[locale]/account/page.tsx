'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, Lock, Bell, ShieldAlert, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { THAI_PROVINCES } from '@/lib/thai-provinces';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { uploadToR2 } from '@/app/actions/upload-r2';
import { useToast } from '@/hooks/use-toast';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';
import { formatPhoneNumber, formatBankAccount } from '@/lib/utils';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';

import bblLogo from '@/pic/logo-bank/กรุงเทพ.png';
import kbankLogo from '@/pic/logo-bank/กสิกร.png';
import ktbLogo from '@/pic/logo-bank/กรุงไทย.png';
import scbLogo from '@/pic/logo-bank/ไทยพาณิช.png';
import bayLogo from '@/pic/logo-bank/กรุงศรี.png';
import ttbLogo from '@/pic/logo-bank/ttb.png';
import gsbLogo from '@/pic/logo-bank/ออมสิน.png';
import baacLogo from '@/pic/logo-bank/ธนาคาร ธกส.png';
import cimbLogo from '@/pic/logo-bank/Cimb.png';
import uobLogo from '@/pic/logo-bank/UOB.png';
import tiscoLogo from '@/pic/logo-bank/ทิสโก้.png';
import ibankLogo from '@/pic/logo-bank/ธนาคารอิสลาม.png';
import ghbLogo from '@/pic/logo-bank/ธอส.png';
import kkpLogo from '@/pic/logo-bank/เกียรตินาคิน.png';
import lhLogo from '@/pic/logo-bank/แลนด์แลนด์เฮ้าท์ .png';
import icbcLogo from '@/pic/logo-bank/ICBC.png';
import bocLogo from '@/pic/logo-bank/ธนาคารแห่งประเทศจีน.png';


const banks = [
  { name: "Bangkok Bank", logo: bblLogo, color: "#1e4598" },
  { name: "Kasikornbank", logo: kbankLogo, color: "#138f2d" },
  { name: "Krungthai Bank", logo: ktbLogo, color: "#1ba5e1" },
  { name: "SCB", logo: scbLogo, color: "#4e2e7f" },
  { name: "Krungsri", logo: bayLogo, color: "#fec43b" },
  { name: "ttb", logo: ttbLogo, color: "#102a4d" },
  { name: "Government Savings Bank", logo: gsbLogo, color: "#eb198d" },
  { name: "BAAC", logo: baacLogo, color: "#4b9b1d" },
  { name: "CIMB Thai", logo: cimbLogo, color: "#7e2f36" },
  { name: "UOB", logo: uobLogo, color: "#0b3979" },
  { name: "TISCO", logo: tiscoLogo, color: "#1a4d8d" },
  { name: "Islamic Bank of Thailand", logo: ibankLogo, color: "#164134" },
  { name: "GH Bank", logo: ghbLogo, color: "#f58523" },
  { name: "Kiatnakin Phatra Bank", logo: kkpLogo, color: "#6e5a9c" },
  { name: "Land and Houses Bank", logo: lhLogo, color: "#6d6e71" },
  { name: "ICBC (Thai)", logo: icbcLogo, color: "#c4161c" },
  { name: "Bank of China (Thai)", logo: bocLogo, color: "#b40026" },
];

export default function AccountPage() {
  const { firestore, storage, auth } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const t = useTranslations('Account');
  const tBanks = useTranslations('Banks');
  const tRegions = useTranslations('Regions');
  const locale = useLocale();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    photoURL: '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Lawyer specific state
  const [isLawyer, setIsLawyer] = useState(false);
  const [lawyerData, setLawyerData] = useState({
    phone: '',
    licenseNumber: '',
    address: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    serviceProvinces: '',
    specialty: '',
    description: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (!firestore || !user) {
        if (!user) setIsLoading(false);
        return;
      }

      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfileData({
            name: data.name || user.displayName || '',
            email: user.email || '',
            photoURL: data.avatar || user.photoURL || '',
          });
        } else {
          setProfileData({
            name: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
          });
        }

        // Check for lawyer profile
        const lawyerDocRef = doc(firestore, 'lawyerProfiles', user.uid);
        const lawyerDoc = await getDoc(lawyerDocRef);
        if (lawyerDoc.exists()) {
          setIsLawyer(true);
          const lData = lawyerDoc.data();
          setLawyerData({
            phone: lData.phone || '',
            licenseNumber: lData.licenseNumber || '',
            address: lData.address || '',
            bankName: lData.bankName || '',
            bankAccountName: lData.bankAccountName || '',
            bankAccountNumber: lData.bankAccountNumber || '',
            serviceProvinces: Array.isArray(lData.serviceProvinces) ? lData.serviceProvinces.join(', ') : lData.serviceProvinces || '',
            specialty: Array.isArray(lData.specialty) ? lData.specialty.join(', ') : lData.specialty || '',
            description: lData.description || '',
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          variant: "destructive",
          title: t('errors.fetchFailed'),
          description: t('errors.fetchFailed')
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [firestore, user, toast, t]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: "destructive",
          title: t('errors.fileTooLarge'),
          description: t('errors.fileLimit', { size: MAX_FILE_SIZE_MB })
        });
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setImageFile(file);
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setProfileData(prev => ({ ...prev, photoURL: previewUrl }));
    }
  };

  const handleSaveProfile = async () => {
    if (!firestore || !user) return;
    setIsSaving(true);
    try {
      let newPhotoURL = profileData.photoURL;

      // 1. Upload Image if changed
      if (imageFile) {
        try {
          const formData = new FormData();
          formData.append('file', imageFile);

          // Upload to R2 via Server Action
          newPhotoURL = await uploadToR2(formData, 'profile-images');

        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          toast({
            variant: "destructive",
            title: t('errors.uploadFailed'),
            description: t('errors.uploadCheck')
          });
          // Don't stop saving profile, just keep old photo or skip update
          newPhotoURL = profileData.photoURL.startsWith('blob:') ? user.photoURL || '' : profileData.photoURL;
        }
      }

      // Ensure we don't save blob URLs to Firestore/Auth
      if (newPhotoURL && newPhotoURL.startsWith('blob:')) {
        newPhotoURL = user.photoURL || '';
      }

      // 2. Update Auth Profile
      if (auth && auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: profileData.name,
            photoURL: newPhotoURL
          });
        } catch (authError) {
          console.error("Error updating auth profile:", authError);
          // Continue to update Firestore even if Auth update fails (e.g. rate limit)
        }
      }

      // 3. Update Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      const updateData: any = {
        name: profileData.name,
        updatedAt: new Date()
      };
      if (newPhotoURL) updateData.avatar = newPhotoURL;

      if (userDoc.exists()) {
        await updateDoc(userDocRef, updateData);
      } else {
        await setDoc(userDocRef, {
          ...updateData,
          email: user.email,
          role: 'customer',
          createdAt: new Date(),
        });
      }

      // 4. Update Lawyer Profile if applicable
      if (isLawyer) {
        const lawyerDocRef = doc(firestore, 'lawyerProfiles', user.uid);
        await updateDoc(lawyerDocRef, {
          name: profileData.name, // Sync name
          phone: lawyerData.phone,
          licenseNumber: lawyerData.licenseNumber,
          address: lawyerData.address,
          bankName: lawyerData.bankName,
          bankAccountName: lawyerData.bankAccountName,
          bankAccountNumber: lawyerData.bankAccountNumber,
          serviceProvinces: lawyerData.serviceProvinces.split(',').map(s => s.trim()).filter(s => s),
          specialty: lawyerData.specialty.split(',').map(s => s.trim()).filter(s => s),
          description: lawyerData.description,
          updatedAt: new Date()
        });

        // Also update image if changed
        if (newPhotoURL) {
          await updateDoc(lawyerDocRef, { imageUrl: newPhotoURL });
        }
      }

      toast({
        title: t('success.profileUpdated'),
        description: t('success.profileUpdatedDetail')
      });
      setIsEditingProfile(false);
      setImageFile(null);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: t('errors.saveFailed'),
        description: error.message || t('errors.saveFailed')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com');

  const handlePasswordChange = async () => {
    if (!user || !auth || !auth.currentUser) return;

    if (!isGoogleUser && !passwords.currentPassword) {
      toast({
        variant: "destructive",
        title: t('errors.authFailed'),
        description: t('errors.incorrectPassword')
      });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        variant: "destructive",
        title: t('errors.passwordMismatch'),
        description: t('errors.passwordMismatchDetail')
      });
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: t('errors.passwordTooShort'),
        description: t('errors.passwordTooShortDetail')
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      // Re-authenticate user if not a Google user
      if (!isGoogleUser) {
        const credential = EmailAuthProvider.credential(user.email!, passwords.currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }

      await updatePassword(auth.currentUser, passwords.newPassword);
      toast({
        title: t('success.passwordChanged'),
        description: t('success.passwordChangedDetail')
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error("Error changing password:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast({
          variant: "destructive",
          title: t('errors.authFailed'),
          description: t('errors.incorrectPassword')
        });
      } else if (error.code === 'auth/requires-recent-login') {
        toast({
          variant: "destructive",
          title: t('errors.authFailed'),
          description: t('errors.reloginRequired')
        });
      } else {
        toast({
          variant: "destructive",
          title: t('errors.changePasswordFailed'),
          description: t('errors.changePasswordFailed') + ": " + error.message
        });
      }
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p>{t('loginRequired')}</p>
        <Button asChild><Link href={`/${locale}/login`}>{t('login')}</Link></Button>
      </div>
    )
  }

  return (
    <div className="bg-gray-100/50">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <Link href={`/${locale}/dashboard`} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t('backToDashboard')}
            </Link>
            <h1 className="text-3xl font-bold font-headline">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>

          {/* Profile Information */}
          <Card className="rounded-3xl shadow-sm border-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <User className="w-6 h-6" />
                <div>
                  <CardTitle>{t('profileInfo')}</CardTitle>
                  <CardDescription>{t('profileInfoSubtitle')}</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(!isEditingProfile)} disabled={isSaving} className="rounded-full">
                {isEditingProfile ? t('cancel') : t('edit')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profileData.photoURL} />
                  <AvatarFallback>{profileData.name ? profileData.name.charAt(0) : 'U'}</AvatarFallback>
                </Avatar>
                {isEditingProfile && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-full">{t('changeImage')}</Button>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('name')}</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    disabled={!isEditingProfile || isSaving}
                    className="rounded-full px-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input id="email" type="email" value={profileData.email} disabled className="rounded-full px-4" />
                </div>
              </div>

              {isLawyer && (
                <>
                  <Separator className="my-4" />
                  <h3 className="text-lg font-semibold mb-4">{t('lawyerInfo')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('phone')}</Label>
                      <Input
                        id="phone"
                        value={lawyerData.phone}
                        onChange={(e) => setLawyerData({ ...lawyerData, phone: formatPhoneNumber(e.target.value) })}
                        disabled={!isEditingProfile || isSaving}
                        maxLength={12}
                        className="rounded-full px-4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license">{t('licenseNumber')}</Label>
                      <Input
                        id="license"
                        value={lawyerData.licenseNumber}
                        onChange={(e) => setLawyerData({ ...lawyerData, licenseNumber: e.target.value })}
                        disabled={!isEditingProfile || isSaving}
                        className="rounded-full px-4"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">{t('officeAddress')}</Label>
                      <Input
                        id="address"
                        value={lawyerData.address}
                        onChange={(e) => setLawyerData({ ...lawyerData, address: e.target.value })}
                        disabled={!isEditingProfile || isSaving}
                        className="rounded-full px-4"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">{t('bio')}</Label>
                      <Input
                        id="description"
                        value={lawyerData.description}
                        onChange={(e) => setLawyerData({ ...lawyerData, description: e.target.value })}
                        disabled={!isEditingProfile || isSaving}
                        className="rounded-full px-4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provinces">{t('serviceProvinces')}</Label>
                      <div className="space-y-3">
                        <Select
                          onValueChange={(value) => {
                            const currentProvinces = lawyerData.serviceProvinces ? lawyerData.serviceProvinces.split(',').map(s => s.trim()).filter(s => s) : [];
                            if (!currentProvinces.includes(value)) {
                              const newProvinces = [...currentProvinces, value];
                              setLawyerData({ ...lawyerData, serviceProvinces: newProvinces.join(',') });
                            }
                          }}
                          disabled={!isEditingProfile || isSaving}
                        >
                          <SelectTrigger className="rounded-full px-4">
                            <SelectValue placeholder={t('selectProvince')} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {THAI_PROVINCES.map((region) => (
                              <SelectGroup key={region.region}>
                                <SelectLabel>{tRegions(region.region)}</SelectLabel>
                                {region.provinces.map((province) => (
                                  <SelectItem key={province} value={province}>
                                    {province}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex flex-wrap gap-2">
                          {lawyerData.serviceProvinces ? lawyerData.serviceProvinces.split(',').map(s => s.trim()).filter(s => s).map((province) => (
                            <Badge key={province} variant="secondary" className="flex items-center gap-1">
                              {province}
                              {isEditingProfile && !isSaving && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentProvinces = lawyerData.serviceProvinces.split(',').map(s => s.trim()).filter(s => s);
                                    const newProvinces = currentProvinces.filter(p => p !== province);
                                    setLawyerData({ ...lawyerData, serviceProvinces: newProvinces.join(',') });
                                  }}
                                  className="hover:bg-muted rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                  <span className="sr-only">{t('edit')} {province}</span>
                                </button>
                              )}
                            </Badge>
                          )) : (
                            <span className="text-sm text-muted-foreground">{t('noProvincesSelected')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="specialty">{t('specialty')}</Label>
                      <Input
                        id="specialty"
                        value={lawyerData.specialty}
                        onChange={(e) => setLawyerData({ ...lawyerData, specialty: e.target.value })}
                        disabled={!isEditingProfile || isSaving}
                        placeholder={t('specialtyPlaceholder')}
                        className="rounded-full px-4"
                      />
                    </div>
                  </div>

                  <Separator className="my-4" />
                  <h3 className="text-lg font-semibold mb-4">{t('bankInfo')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">{t('bankName')}</Label>
                      <Label htmlFor="bankName">{t('bankName')}</Label>
                      <Select
                        value={lawyerData.bankName}
                        onValueChange={(value) => setLawyerData({ ...lawyerData, bankName: value })}
                        disabled={!isEditingProfile || isSaving}
                      >
                        <SelectTrigger className="rounded-full px-4">
                          <SelectValue placeholder={t('selectBank')} />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map(bank => (
                            <SelectItem key={bank.name} value={bank.name}>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 relative rounded-lg overflow-hidden border bg-white flex items-center justify-center">
                                  <Image
                                    src={bank.logo}
                                    alt={bank.name}
                                    className="object-contain p-0.5"
                                    fill
                                  />
                                </div>
                                <span>{tBanks(bank.name)}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankAccountName">{t('accountName')}</Label>
                      <Input
                        id="bankAccountName"
                        value={lawyerData.bankAccountName}
                        onChange={(e) => setLawyerData({ ...lawyerData, bankAccountName: e.target.value })}
                        disabled={!isEditingProfile || isSaving}
                        placeholder={t('accountNamePlaceholder')}
                        className="rounded-full px-4"
                      />
                      {lawyerData.bankAccountName && lawyerData.bankAccountName !== profileData.name && (
                        <p className="text-xs text-red-500">{t('accountNameError')}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankAccount">{t('accountNumber')}</Label>
                      <Input
                        id="bankAccount"
                        value={lawyerData.bankAccountNumber}
                        onChange={(e) => setLawyerData({ ...lawyerData, bankAccountNumber: formatBankAccount(e.target.value) })}
                        disabled={!isEditingProfile || isSaving}
                        placeholder="xxx-x-xxxxx-x"
                        maxLength={14}
                        className="rounded-full px-4"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            {isEditingProfile && (
              <CardFooter>
                <Button onClick={handleSaveProfile} disabled={isSaving} className="rounded-full">
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('saving')}</> : t('saveChanges')}
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Password Settings */}
          <Card className="rounded-3xl shadow-sm border-none">
            <CardHeader className="flex items-center gap-4">
              <Lock className="w-6 h-6" />
              <div>
                <CardTitle>{t('security')}</CardTitle>
                <CardDescription>{t('changePassword')}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isGoogleUser && (
                <div className="space-y-2">
                  <Label htmlFor="current-password">{t('currentPassword')}</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    className="rounded-full px-4"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t('newPassword')}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className="rounded-full px-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t('confirmNewPassword')}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    className="rounded-full px-4"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handlePasswordChange} disabled={isChangingPassword || !passwords.newPassword} className="rounded-full">
                {isChangingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('changing')}</> : t('changePassword')}
              </Button>
            </CardFooter>
          </Card>

          {/* Notifications */}
          <Card className="rounded-3xl shadow-sm border-none">
            <CardHeader className="flex items-center gap-4">
              <Bell className="w-6 h-6" />
              <div>
                <CardTitle>{t('notifications')}</CardTitle>
                <CardDescription>{t('notificationsSubtitle')}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-3xl">
                <div>
                  <Label htmlFor="newsletter" className="font-medium">{t('emailNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">{t('emailNotificationsSubtitle')}</p>
                </div>
                <Switch id="newsletter" defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="rounded-3xl shadow-sm border-destructive">
            <CardHeader className="flex items-center gap-4">
              <ShieldAlert className="w-6 h-6 text-destructive" />
              <div>
                <CardTitle className="text-destructive">{t('dangerZone')}</CardTitle>
                <CardDescription>{t('dangerZoneSubtitle')}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-3xl bg-destructive/5">
                <div>
                  <p className="font-semibold">{t('deleteAccount')}</p>
                  <p className="text-sm text-muted-foreground">{t('deleteAccountSubtitle')}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="rounded-full">{t('deleteMyAccount')}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('deleteConfirmSubtitle')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{t('confirmDelete')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  );
}
