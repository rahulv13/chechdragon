
'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Title } from '@/lib/data';
import {
  Activity,
  BookOpen,
  Clapperboard,
  Film,
  List,
  Target,
  BookMarked
} from 'lucide-react';
import DashboardCharts from '@/components/dashboard-charts';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const titlesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'titles');
  }, [firestore, user?.uid]);

  const { data: allTitles, isLoading } = useCollection<Title>(titlesQuery);

  const publicTitles = useMemo(() => {
    if (isLoading || !allTitles) return [];
    return allTitles?.filter(t => !t.isSecret) || [];
  }, [allTitles, isLoading]);

  const stats = useMemo(() => {
    if (isLoading || !allTitles) {
      return [
        { label: 'Anime Watched', value: 0, change: '+0' },
        { label: 'Manga Read', value: 0, change: '+0' },
        { label: 'Manhwa Read', value: 0, change: '+0' },
        { label: 'Episodes Watched', value: 0, change: '+0' },
        { label: 'In Progress', value: 0, change: '+0' },
        { label: 'Total Entries', value: 0, change: '+0' },
        { label: 'Avg. Score', value: '0.00', change: '+0.0' },
      ];
    }
    const animeWatched = publicTitles.filter(
      (t) => t.type === 'Anime' && t.status === 'Completed'
    ).length;
    const mangaRead = publicTitles.filter(
      (t) => t.type === 'Manga' && t.status === 'Completed'
    ).length;
     const manhwaRead = publicTitles.filter(
      (t) => t.type === 'Manhwa' && t.status === 'Completed'
    ).length;
    const episodesWatched = publicTitles
      .filter((t) => t.type === 'Anime')
      .reduce((sum, t) => sum + t.progress, 0);
    const inProgress = publicTitles.filter(
      (t) => t.status === 'Watching' || t.status === 'Reading'
    ).length;
    const totalEntries = publicTitles.length;
    const scoredTitles = publicTitles.filter((t) => t.score > 0);
    const avgScore =
      scoredTitles.length > 0
        ? (
            scoredTitles.reduce((sum, t) => sum + t.score, 0) /
            scoredTitles.length
          ).toFixed(2)
        : '0.00';

    return [
      { label: 'Anime Watched', value: animeWatched, change: '+0' },
      { label: 'Manga Read', value: mangaRead, change: '+0' },
      { label: 'Manhwa Read', value: manhwaRead, change: '+0' },
      { label: 'Episodes Watched', value: episodesWatched, change: '+0' },
      { label: 'In Progress', value: inProgress, change: '+0' },
      { label: 'Total Entries', value: totalEntries, change: '+0' },
      { label: 'Avg. Score', value: avgScore, change: '+0.0' },
    ];
  }, [allTitles, publicTitles, isLoading]);

  const recentActivity = useMemo(() => {
    if (isLoading || !publicTitles) {
       return Array.from({ length: 6 }, (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          return {
            name: d.toLocaleString('default', { month: 'short' }),
            anime: 0,
            manga: 0,
            manhwa: 0,
          };
        }).reverse();
    }

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return {
        name: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        month: d.getMonth(),
        anime: 0,
        manga: 0,
        manhwa: 0,
      };
    }).reverse();

    if (publicTitles) {
      for (const title of publicTitles) {
        if (title.updatedAt?.toDate) {
          const updatedDate = title.updatedAt.toDate();
          const monthIndex = months.findIndex(
            (m) =>
              m.year === updatedDate.getFullYear() &&
              m.month === updatedDate.getMonth()
          );
          if (monthIndex !== -1) {
            if (title.type === 'Anime') {
              months[monthIndex].anime += 1;
            } else if (title.type === 'Manga') {
              months[monthIndex].manga += 1;
            } else if (title.type === 'Manhwa') {
                months[monthIndex].manhwa += 1;
            }
          }
        }
      }
    }
    return months.map(({ name, anime, manga, manhwa }) => ({ name, anime, manga, manhwa }));
  }, [publicTitles, isLoading]);
  
  const statusDistribution = useMemo(() => {
    if (isLoading || !publicTitles) return [];
    const watching = publicTitles.filter((t) => t.status === 'Watching').length;
    const reading = publicTitles.filter((t) => t.status === 'Reading').length;
    const planned = publicTitles.filter((t) => t.status === 'Planned').length;
    const completed = publicTitles.filter((t) => t.status === 'Completed').length;
    return [
      { name: 'Watching', value: watching, fill: 'var(--color-watching)' },
      { name: 'Reading', value: reading, fill: 'var(--color-reading)' },
      { name: 'Planned', value: planned, fill: 'var(--color-planned)' },
      { name: 'Completed', value: completed, fill: 'var(--color-completed)' },
    ];
  }, [publicTitles, isLoading]);


  const iconMap: { [key: string]: React.ReactNode } = {
    'Anime Watched': <Film className="h-6 w-6 text-muted-foreground" />,
    'Manga Read': <BookOpen className="h-6 w-6 text-muted-foreground" />,
    'Manhwa Read': <BookMarked className="h-6 w-6 text-muted-foreground" />,
    'Episodes Watched': <Clapperboard className="h-6 w-6 text-muted-foreground" />,
    'In Progress': <Activity className="h-6 w-6 text-muted-foreground" />,
    'Total Entries': <List className="h-6 w-6 text-muted-foreground" />,
    'Avg. Score': <Target className="h-6 w-6 text-muted-foreground" />,
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              {iconMap[stat.label]}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.change} vs last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <DashboardCharts
              activityData={recentActivity}
              distributionData={statusDistribution}
            />
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>List Distribution</CardTitle>
            <CardDescription>
              Your collection by status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardCharts
              activityData={recentActivity}
              distributionData={statusDistribution}
              chartType="pie"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
