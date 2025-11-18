
'use client';

import { useMemo, useState } from 'react';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Title } from '@/lib/data';
import { AnimeCard } from '@/components/anime-card';
import { KeyRound } from 'lucide-react';
import { PaginationControls } from '@/components/pagination-controls';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

const ITEMS_PER_PAGE = 10;

const ListTabContent = ({
  titles,
  emptyMessage,
  page,
  totalPages,
  onPageChange,
}: {
  titles: Title[] | null;
  emptyMessage: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (!titles) {
    return <p className="text-muted-foreground col-span-full">Loading...</p>;
  }

  if (titles.length === 0) {
    return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-8 py-24">
            <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl font-bold tracking-tight">{emptyMessage}</h3>
                <p className="text-sm text-muted-foreground">
                    Mark a title as secret to add it here.
                </p>
            </div>
        </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 pt-4">
        {titles.map((item) => (
          <AnimeCard key={item.id} item={item} />
        ))}
      </div>
      {totalPages > 1 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
};


export default function SecretPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [currentPages, setCurrentPages] = useState({
    anime: 1,
    manga: 1,
    manhwa: 1,
  });

  const secretTitlesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'users', user.uid, 'titles'),
      where('isSecret', '==', true)
    );
  }, [firestore, user?.uid]);

  const { data: secretTitles, isLoading } = useCollection<Title>(secretTitlesQuery);
  
  const secretAnime = useMemo(() => secretTitles?.filter(t => t.type === 'Anime') || [], [secretTitles]);
  const secretManga = useMemo(() => secretTitles?.filter(t => t.type === 'Manga') || [], [secretTitles]);
  const secretManhwa = useMemo(() => secretTitles?.filter(t => t.type === 'Manhwa') || [], [secretTitles]);

  const handlePageChange = (tab: keyof typeof currentPages, page: number) => {
    setCurrentPages(prev => ({ ...prev, [tab]: page }));
  };
  
  const paginatedData = useMemo(() => {
    const paginate = (items: Title[], page: number) => {
      const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
      const paginatedItems = items.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
      );
      return { items: paginatedItems, totalPages };
    };
    return {
      anime: paginate(secretAnime, currentPages.anime),
      manga: paginate(secretManga, currentPages.manga),
      manhwa: paginate(secretManhwa, currentPages.manhwa),
    };
  }, [secretAnime, secretManga, secretManhwa, currentPages]);


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center space-x-4">
        <KeyRound className="h-10 w-10 text-primary" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Secret Stash</h2>
          <p className="text-muted-foreground">
            Your private collection of anime and manga.
          </p>
        </div>
      </div>

      {isLoading || !secretTitles ? (
        <p className="text-muted-foreground">Loading your secret list...</p>
      ) : (
         <Tabs defaultValue="anime" className="space-y-4 pt-4">
            <TabsList>
                <TabsTrigger value="anime">Anime</TabsTrigger>
                <TabsTrigger value="manga">Manga</TabsTrigger>
                <TabsTrigger value="manhwa">Manhwa</TabsTrigger>
            </TabsList>
            <TabsContent value="anime" className="space-y-4">
                <ListTabContent
                    titles={paginatedData.anime.items}
                    emptyMessage="No secret anime."
                    page={currentPages.anime}
                    totalPages={paginatedData.anime.totalPages}
                    onPageChange={(page) => handlePageChange('anime', page)}
                />
            </TabsContent>
            <TabsContent value="manga" className="space-y-4">
                <ListTabContent
                    titles={paginatedData.manga.items}
                    emptyMessage="No secret manga."
                    page={currentPages.manga}
                    totalPages={paginatedData.manga.totalPages}
                    onPageChange={(page) => handlePageChange('manga', page)}
                />
            </TabsContent>
            <TabsContent value="manhwa" className="space-y-4">
                <ListTabContent
                    titles={paginatedData.manhwa.items}
                    emptyMessage="No secret manhwa."
                    page={currentPages.manhwa}
                    totalPages={paginatedData.manhwa.totalPages}
                    onPageChange={(page) => handlePageChange('manhwa', page)}
                />
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
