
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateUserSecretPassword } from '@/lib/data';

interface SecretContextType {
  isUnlocked: boolean;
  unlock: () => void;
}

const SecretContext = createContext<SecretContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'draglist-secret-unlocked-';

export function SecretProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, 'users', user.uid) : null),
    [user?.uid, firestore]
  );
  
  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  const secretPassword = (userData as { secretPassword?: string })?.secretPassword;

  const storageKey = user ? `${STORAGE_KEY_PREFIX}${user.uid}` : null;

  useEffect(() => {
    if (!storageKey) {
      setIsUnlocked(false);
      return;
    }
    try {
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue === 'true') {
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
      }
    } catch (error) {
      console.warn('Could not access localStorage:', error);
      setIsUnlocked(false);
    }
  }, [storageKey]);

  const handleCreatePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please re-enter your password.',
      });
      return;
    }
    if (newPassword.length < 4) {
      toast({
        variant: 'destructive',
        title: 'Password too short',
        description: 'Please choose a password with at least 4 characters.',
      });
      return;
    }
    if (firestore && user?.uid) {
      updateUserSecretPassword(firestore, user.uid, newPassword);
      toast({
        title: 'Password Set!',
        description: 'Your secret section is now protected.',
      });
      // The useDoc hook will automatically update `userData`
    }
  };

  const handleUnlock = () => {
    if (password === secretPassword) {
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, 'true');
        } catch (error) {
          console.warn('Could not write to localStorage:', error);
        }
      }
      setIsUnlocked(true);
      toast({
        title: 'Access Granted',
        description: 'Welcome to the secret area.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'The password you entered is incorrect.',
      });
    }
    setPassword('');
  };

  const handleResetPassword = () => {
    if (firestore && user?.uid) {
      // For simplicity, we'll just clear the password. 
      // In a real app, you might want a more secure flow.
      updateUserSecretPassword(firestore, user.uid, null);
      toast({
        title: 'Password Reset',
        description: 'Your secret password has been cleared. Please create a new one.',
      });
    }
  };

  if (!user || isUserDocLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!isUnlocked) {
    if (!secretPassword) {
      // First time setup: Create a password
      return (
        <Dialog open={true}>
          <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()} hideCloseButton={true}>
            <DialogHeader className="text-center space-y-4">
              <div className="flex justify-center"><ShieldCheck className="h-12 w-12 text-primary" /></div>
              <DialogTitle className="text-2xl">Create Secret Password</DialogTitle>
              <DialogDescription>
                Set a password to protect your secret anime and manga stash.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreatePassword()} />
              </div>
              <Button onClick={handleCreatePassword} className="w-full">Set Password</Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    }
    // Existing password: Unlock
    return (
      <AlertDialog>
        <Dialog open={true}>
          <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()} hideCloseButton={true}>
            <DialogHeader className="text-center space-y-4">
              <div className="flex justify-center"><ShieldCheck className="h-12 w-12 text-primary" /></div>
              <DialogTitle className="text-2xl">Secret Area</DialogTitle>
              <DialogDescription>
                This section is password protected. Please enter the password to continue.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} />
              </div>
              <div className="flex flex-col space-y-2">
                <Button onClick={handleUnlock} className="w-full">Unlock</Button>
                 <AlertDialogTrigger asChild>
                  <Button variant="link" className="text-sm text-muted-foreground">Forgot password?</Button>
                </AlertDialogTrigger>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Reset Secret Password?</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to reset your secret password? You will be prompted to create a new one.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetPassword}>Reset Password</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <SecretContext.Provider value={{ isUnlocked, unlock: handleUnlock }}>
      {children}
    </SecretContext.Provider>
  );
}

export function useSecret() {
  const context = useContext(SecretContext);
  if (context === undefined) {
    throw new Error('useSecret must be used within a SecretProvider');
  }
  return context;
}
