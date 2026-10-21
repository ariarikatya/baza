'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RewardGrantRow } from '@/types';
import { useRequireSession } from '@/lib/useRequireSession';
import { Award, X, CheckCircle2, Lock } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface RawLevelRow {
  'Название'?: string;
  'Название для отображения'?: string;
  'Картинка'?: string;
  'За сколько'?: string | number;
  'Категория'?: string;
  'Описание'?: string;
  'Уровень'?: string | number;
  [key: string]: any;
}

interface LevelDetail {
  levelNumber: number;
  title: string;
  requiredCount: number;
  category: string;
  description: string;
  colorImage: string;
  bwImage: string;
  isEarned: boolean;
}

interface GroupedReward {
  groupName: string;
  category: string;
  description: string;
  userTotalCount: number;
  isEarned: boolean;
  currentTitle: string;
  currentImage: string;
  currentRequiredCount: number;
  nextThreshold: number;
  levels: LevelDetail[];
}

function getUserRewardTotal(
  nick: string,
  rewardName: string,
  grants: RewardGrantRow[] = []
): number {
  if (!nick || !rewardName) return 0;
  const targetNick = nick.trim().toLowerCase();
  const targetReward = rewardName.trim().toLowerCase();

  return grants.reduce((acc, row) => {
    const rNick = row['Ник']?.trim().toLowerCase();
    const rName = row['Название']?.trim().toLowerCase();
    if (rNick === targetNick && rName === targetReward) {
      const qty = Number(row['Количество']);
      return acc + (isNaN(qty) || qty <= 0 ? 1 : qty);
    }
    return acc;
  }, 0);
}

export default function HeraldryPage() {
  const { user: currentUser, loading: sessionLoading } = useRequireSession();
  const [colorRows, setColorRows] = useState<RawLevelRow[]>([]);
  const [bwRows, setBwRows] = useState<RawLevelRow[]>([]);
  const [grants, setGrants] = useState<RewardGrantRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [selectedRewardGroupModal, setSelectedRewardGroupModal] = useState<GroupedReward | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHeraldryData() {
      try {
        const [colorRes, bwRes, grantsRes] = await Promise.all([
          fetch('/api/sheets?sheet=Награды по отдельности'),
          fetch('/api/sheets?sheet=Награды чб по отдельности'),
          fetch('/api/sheets?sheet=НАЧИСЛЕНИЕ НАГРАД'),
        ]);

        const colorData = await colorRes.json();
        const bwData = await bwRes.json();
        const grantsData = await grantsRes.json();

        if (colorData.data && Array.isArray(colorData.data)) setColorRows(colorData.data);
        if (bwData.data && Array.isArray(bwData.data)) setBwRows(bwData.data);
        if (grantsData.data && Array.isArray(grantsData.data)) setGrants(grantsData.data);
      } catch (err) {
        console.error('Failed to load heraldry data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (currentUser) {
      fetchHeraldryData();
    }
  }, [currentUser]);

  if (sessionLoading || !currentUser) {
    return (
      <AppLayout>
        <LoadingSpinner text="Загрузка наград…" />
      </AppLayout>
    );
  }

  const myNick = currentUser?.['Ник'] || '';

  const categories = ['Все', 'Комбинации', 'Игровые', 'Турнирные', 'Другие'];

  const groupedRewards: GroupedReward[] = (() => {
    const allGroupNames = Array.from(
      new Set([
        ...colorRows.map((r) => String(r['Название'] || '').trim()).filter(Boolean),
        ...bwRows.map((r) => String(r['Название'] || '').trim()).filter(Boolean),
      ])
    );

    return allGroupNames.map((groupName) => {
      const groupNameLower = groupName.toLowerCase();

      const groupColorLevels = colorRows.filter(
        (r) => String(r['Название'] || '').trim().toLowerCase() === groupNameLower
      );
      const groupBwLevels = bwRows.filter(
        (r) => String(r['Название'] || '').trim().toLowerCase() === groupNameLower
      );

      const maxLevelsCount = Math.max(groupColorLevels.length, groupBwLevels.length, 1);
      const levelDetails: LevelDetail[] = [];

      for (let i = 0; i < maxLevelsCount; i++) {
        const cRow = groupColorLevels[i] || {};
        const bRow = groupBwLevels[i] || {};

        const levelNumber = Number(cRow['Уровень'] || bRow['Уровень']) || (i + 1);
        const requiredCount = Number(cRow['За сколько'] || bRow['За сколько']) || (i === 0 ? 1 : (i + 1) * 5);
        const title = String(
          cRow['Название для отображения'] ||
            bRow['Название для отображения'] ||
            cRow['Название'] ||
            bRow['Название'] ||
            `Уровень ${levelNumber}`
        ).trim();
        const category = String(cRow['Категория'] || bRow['Категория'] || 'Другие').trim();
        const description = String(cRow['Описание'] || bRow['Описание'] || '').trim();
        const colorImage = String(cRow['Картинка'] || '').trim();
        const bwImage = String(bRow['Картинка'] || colorImage).trim();

        levelDetails.push({
          levelNumber,
          title,
          requiredCount,
          category,
          description,
          colorImage,
          bwImage,
          isEarned: false,
        });
      }

      levelDetails.sort((a, b) => a.requiredCount - b.requiredCount || a.levelNumber - b.levelNumber);

      const userTotalCount = getUserRewardTotal(myNick, groupName, grants);

      levelDetails.forEach((lvl) => {
        lvl.isEarned = userTotalCount >= lvl.requiredCount;
      });

      const earnedLevels = levelDetails.filter((l) => l.isEarned);
      const isEarned = earnedLevels.length > 0;

      const activeLevel = isEarned
        ? earnedLevels[earnedLevels.length - 1]
        : levelDetails[0];

      const currentTitle = activeLevel.title;
      const currentImage = isEarned
        ? activeLevel.colorImage || activeLevel.bwImage
        : activeLevel.bwImage || activeLevel.colorImage;
      const currentRequiredCount = activeLevel.requiredCount;
      const category = activeLevel.category || 'Другие';
      const description = activeLevel.description || '';

      const unearnedLevels = levelDetails.filter((l) => !l.isEarned);
      const nextThreshold = unearnedLevels.length > 0
        ? unearnedLevels[0].requiredCount
        : levelDetails[levelDetails.length - 1].requiredCount;

      return {
        groupName,
        category,
        description,
        userTotalCount,
        isEarned,
        currentTitle,
        currentImage,
        currentRequiredCount,
        nextThreshold,
        levels: levelDetails,
      };
    });
  })();

  const filteredGroups = groupedRewards.filter((group) => {
    if (selectedCategory === 'Все') return true;
    return group.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase();
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand/10 text-brand rounded-xl">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Геральдика и Награды</h1>
              <p className="text-xs text-muted-foreground">Достижения и кубки игроков покерного клуба &quot;БАЗА&quot;</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-muted p-1.5 rounded-xl border border-border">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[38px] ${
                  selectedCategory === cat
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Загрузка списка наград…" />
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-2xl p-6">
            Награды в этой категории не найдены.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredGroups.map((group, idx) => {
              const progressPercent = Math.min(
                100,
                Math.round((group.userTotalCount / (group.nextThreshold || 1)) * 100)
              );

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedRewardGroupModal(group)}
                  className={`bg-card border rounded-2xl p-4 flex flex-col items-center text-center space-y-3 shadow-md cursor-pointer transition-all hover:scale-[1.02] ${
                    group.isEarned
                      ? 'border-amber-500/50 shadow-amber-500/10'
                      : 'border-border/60 opacity-80'
                  }`}
                >
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center p-2 border border-border shadow-inner">
                    <img
                      src={group.currentImage || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200'}
                      alt={group.currentTitle}
                      className={`w-full h-full object-contain ${
                        !group.isEarned ? 'grayscale contrast-125 opacity-70' : ''
                      }`}
                    />
                    {!group.isEarned && (
                      <div className="absolute top-2 right-2 bg-black/60 p-1 rounded-full text-gray-400">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 w-full">
                    <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">
                      {group.category}
                    </span>
                    <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-1">
                      {group.currentTitle}
                    </h3>
                    {group.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{group.description}</p>
                    )}
                  </div>

                  <div className="w-full pt-2 border-t border-border space-y-1.5 mt-auto">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Набрано:</span>
                      <span className={group.isEarned ? 'text-amber-400 font-bold' : 'text-foreground'}>
                        {group.userTotalCount}/{group.nextThreshold}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border/40">
                      <div
                        className={`h-full transition-all duration-500 ${
                          group.isEarned ? 'bg-amber-400' : 'bg-brand'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedRewardGroupModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 pt-safe pb-safe backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-xl space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedRewardGroupModal(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center space-y-2">
                <span className="text-xs font-bold text-brand uppercase tracking-wider">
                  {selectedRewardGroupModal.category}
                </span>
                <h3 className="text-2xl font-extrabold text-foreground">
                  {selectedRewardGroupModal.groupName}
                </h3>
                {selectedRewardGroupModal.description && (
                  <p className="text-xs text-muted-foreground max-w-md">
                    {selectedRewardGroupModal.description}
                  </p>
                )}
              </div>

              <div className="bg-muted/60 p-4 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground">Всего начислено наград:</span>
                  <span className="text-amber-400 text-sm">{selectedRewardGroupModal.userTotalCount} шт</span>
                </div>

                <div className="w-full h-2.5 bg-card rounded-full overflow-hidden border border-border/60">
                  <div
                    className="h-full bg-amber-400 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (selectedRewardGroupModal.userTotalCount /
                            (selectedRewardGroupModal.nextThreshold || 1)) *
                            100
                        )
                      )}%`,
                    }}
                  ></div>
                </div>

                <div className="flex justify-between text-[11px] text-muted-foreground font-semibold pt-1">
                  <span>Прогресс до след. уровня:</span>
                  <span>
                    {selectedRewardGroupModal.userTotalCount >= selectedRewardGroupModal.nextThreshold
                      ? 'Максимальный уровень получен!'
                      : `Осталось ${selectedRewardGroupModal.nextThreshold - selectedRewardGroupModal.userTotalCount} шт`}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-sm text-foreground">Все уровни награды</h4>
                <div className="space-y-2.5">
                  {selectedRewardGroupModal.levels.map((lvl, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                        lvl.isEarned
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-muted/40 border-border/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-900 p-1 border border-border flex items-center justify-center shrink-0">
                          <img
                            src={
                              lvl.isEarned
                                ? lvl.colorImage || lvl.bwImage
                                : lvl.bwImage || lvl.colorImage
                            }
                            alt={lvl.title}
                            className={`w-full h-full object-contain ${
                              !lvl.isEarned ? 'grayscale contrast-125' : ''
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand/20 text-brand border border-brand/30">
                              Уровень {lvl.levelNumber}
                            </span>
                            <h5 className="font-bold text-xs text-foreground">{lvl.title}</h5>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Порог получения: <strong className="text-foreground">{lvl.requiredCount} шт</strong>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {lvl.isEarned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Получено
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted text-muted-foreground border border-border rounded-lg text-xs font-medium">
                            <Lock className="w-3.5 h-3.5" /> Не получено
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
