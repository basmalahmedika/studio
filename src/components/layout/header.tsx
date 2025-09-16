
'use client';

import { useRouter } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function Header() {
  const { user, signOut: handleSignOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const onSignOut = async () => {
    try {
      await handleSignOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout Error:', error);
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'An unexpected error occurred during logout.',
      });
    }
  };


  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       <div className="md:hidden">
        <SidebarTrigger />
       </div>
      <div className="relative ml-auto flex-1 md:grow-0">
        {/* Can be used for a search bar later */}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
             <Avatar>
              <AvatarImage src="https://picsum.photos/seed/user-avatar/40/40" alt="User Avatar" data-ai-hint="user avatar" />
              <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
             <Link href="/dashboard/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSignOut}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
