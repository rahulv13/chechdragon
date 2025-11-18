
'use client';

import type { Title } from '@/lib/data';
import Image from 'next/image';
import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Form,
  FormControl,
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
import { useToast } from '@/hooks/use-toast';
import { Minus, Plus, Star, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { updateTitle, deleteTitle, addTitle } from '@/lib/data';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from './ui/switch';

type AnimeCardProps = {
  item: Title;
  isSearchResult?: boolean;
};

type FormValues = {
  title: string;
  type: 'Anime' | 'Manga' | 'Manhwa';
  status: 'Watching' | 'Reading' | 'Planned' | 'Completed';
  total: number;
  score: number;
  isSecret: boolean;
};

export function AnimeCard({ item, isSearchResult = false }: AnimeCardProps) {
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const percentage = item.total > 0 ? (item.progress / item.total) * 100 : 0;

  const form = useForm<FormValues>({
    defaultValues: {
      title: item.title,
      type: item.type,
      status: item.status,
      total: item.total,
      score: item.score,
      isSecret: item.isSecret,
    },
  });

  const handleProgressChange = (increment: number) => {
    if (!user) return;

    const isManga = item.type === 'Manga' || item.type === 'Manhwa';
    const maxProgress = item.total > 0 ? item.total : Infinity;
    const newProgress = Math.max(0, Math.min(item.progress + increment, maxProgress));
    const updatedFields: Partial<Title> = { progress: newProgress };

    if (item.total > 0 && newProgress >= item.total) {
      updatedFields.status = 'Completed';
    } else if (newProgress < item.total) {
      // If progress is less than total, it can't be 'Completed'.
      if (item.status === 'Completed') {
        updatedFields.status = isManga ? 'Reading' : 'Watching';
      }
    }
    
    if (newProgress > 0) {
      if (item.status === 'Planned') {
          updatedFields.status = isManga ? 'Reading' : 'Watching';
      }
    } else { // newProgress is 0
      if (item.status !== 'Planned') {
          updatedFields.status = 'Planned';
      }
    }

    updateTitle(firestore, user.uid, item.id, updatedFields);
  };
  
  const handleEditSubmit: SubmitHandler<FormValues> = (data) => {
    if (!user) return;
    updateTitle(firestore, user.uid, item.id, { ...data, total: Number(data.total), score: Number(data.score) });
    toast({
      title: 'Title Updated',
      description: `${data.title} has been updated.`,
    });
    setEditDialogOpen(false);
  };

  const handleDelete = () => {
    if (!user) return;
    deleteTitle(firestore, user.uid, item.id);
    toast({
      title: 'Title Deleted',
      description: `${item.title} has been removed from your lists.`,
      variant: 'destructive',
    });
  };

  const handleAdd = () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to add a title.' });
      return;
    }
    addTitle(firestore, user.uid, {
      title: item.title,
      type: item.type,
      status: 'Planned',
      total: item.total,
      imageUrl: item.imageUrl,
      isSecret: false,
    });
    toast({
      title: 'Title Added',
      description: `${item.title} has been added to your "Planned" list.`,
    });
  };


  const totalDisplay = item.total > 0 ? `/ ${item.total}` : '';

  return (
    <Card className="group overflow-hidden border-2 border-transparent hover:border-primary transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20 flex flex-col">
      <CardHeader className="p-0 relative">
        <Image
          src={item.imageUrl}
          alt={`Cover for ${item.title}`}
          width={400}
          height={600}
          className="w-full object-cover aspect-[2/3] transition-transform duration-300 group-hover:scale-105"
          data-ai-hint={item.imageHint}
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-2 right-2">
           {isSearchResult ? (
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-black/50 hover:bg-primary/80 hover:text-primary-foreground border-none text-white" onClick={handleAdd}>
                <Plus className="h-4 w-4"/>
                <span className="sr-only">Add to list</span>
              </Button>
            ) : (
             <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
              <AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white bg-black/50 hover:bg-black/75 hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DialogTrigger asChild>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>
                 <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete "{item.title}" from your lists.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit {item.title}</DialogTitle>
                  <DialogDescription>
                    Update the details for this title.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleEditSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="title"
                      rules={{ required: 'Title is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Anime">Anime</SelectItem>
                              <SelectItem value="Manga">Manga</SelectItem>
                              <SelectItem value="Manhwa">Manhwa</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Watching">Watching</SelectItem>
                              <SelectItem value="Reading">Reading</SelectItem>
                              <SelectItem value="Planned">Planned</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total"
                      rules={{
                        required: 'Total is required',
                        min: { value: 0, message: 'Must be at least 0' },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Episodes/Chapters</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="score"
                      rules={{ min: 0, max: 10 }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Score</FormLabel>
                          <FormControl>
                             <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isSecret"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Mark as Secret</FormLabel>
                            <FormMessage />
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="submit">Save Changes</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
           )}
        </div>
        <div className="absolute bottom-0 left-0 p-4">
          <CardTitle className="text-lg font-bold text-white drop-shadow-lg">
            {item.title}
          </CardTitle>
        </div>
        {item.score > 0 && (
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 text-base bg-background/80"
          >
            <Star className="w-4 h-4 mr-1 text-yellow-400 fill-yellow-400" />
            {item.score}
          </Badge>
        )}
      </CardHeader>
      <div className="p-4 space-y-2 flex-grow flex flex-col justify-end">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {item.type === 'Anime' ? 'Episode' : 'Chapter'} {item.progress} {totalDisplay}
          </span>
          <span>{item.total > 0 ? `${percentage.toFixed(0)}%` : ''}</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
      {!isSearchResult && (
        <CardFooter className="p-4 pt-0">
          <div className="flex w-full items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleProgressChange(-1)}
              disabled={item.progress <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center font-mono text-lg font-medium">
              {item.progress}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleProgressChange(1)}
              disabled={item.total > 0 && item.progress >= item.total}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
