'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploader } from '@/components/FileUploader';
import { LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/sheets?sheet=ИГРОКИ');
      const json = await res.json();
      const players = json.data || [];

      if (!isRegistering) {
        // Login Flow
        const existingPlayer = players.find(
          (p: any) =>
            p.nickname?.toLowerCase() === nickname.toLowerCase() &&
            (p.password ? p.password === password : true)
        );

        if (existingPlayer) {
          const updatedUser = { ...existingPlayer, isAuthorized: true };
          // Update status in sheet
          await fetch('/api/sheets', {
            method: 'POST',
            body: JSON.stringify({
              sheet: 'ИГРОКИ',
              action: 'update',
              id: existingPlayer.id,
              data: { isAuthorized: true },
            }),
          });

          localStorage.setItem('baza_user', JSON.stringify(updatedUser));
          router.push('/home');
        } else {
          setError('Игрок с таким ником или паролем не найден');
        }
      } else {
        // Registration Flow
        if (players.some((p: any) => p.nickname?.toLowerCase() === nickname.toLowerCase())) {
          setError('Игрок с таким ником уже зарегистрирован');
          setLoading(false);
          return;
        }

        const newPlayer = {
          id: 'p_' + Date.now(),
          nickname,
          password: password || '123456',
          fullName: fullName || nickname,
          phone: phone || '',
          avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          rating: 1000,
          status: 'ИГРОК',
          role: 'Игрок',
          isAuthorized: true,
          registeredAt: new Date().toISOString().split('T')[0],
          gamesPlayed: 0,
          winsCount: 0,
          totalPrizes: 0,
        };

        await fetch('/api/sheets', {
          method: 'POST',
          body: JSON.stringify({
            sheet: 'ИГРОКИ',
            action: 'write',
            data: newPlayer,
          }),
        });

        localStorage.setItem('baza_user', JSON.stringify(newPlayer));
        router.push('/home');
      }
    } catch (err: any) {
      console.error(err);
      setError('Ошибка при авторизации. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center font-bold text-white text-3xl mb-3 shadow-lg">
            Б
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {isRegistering ? 'Регистрация в клубе "БАЗА"' : 'Вход в ПК "БАЗА"'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isRegistering
              ? 'Заполните данные для создания профиля игрока'
              : 'Введите никнейм и пароль для продолжения'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/20 border border-destructive text-destructive text-xs rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Никнейм</label>
            <input
              type="text"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Например: PokerKing"
              className="w-full mt-1 px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-brand focus:outline-none min-h-[44px]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Пароль</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full mt-1 px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-brand focus:outline-none min-h-[44px]"
            />
          </div>

          {isRegistering && (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Имя и Фамилия</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full mt-1 px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-brand focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Телефон</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full mt-1 px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-brand focus:outline-none min-h-[44px]"
                />
              </div>

              <FileUploader
                label="Аватар игрока (сжатие 1MB)"
                onUploadComplete={(url) => setAvatarUrl(url)}
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-brand text-white py-3 rounded-xl font-semibold hover:bg-brand-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
          >
            {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            <span>{isRegistering ? 'Зарегистрироваться' : 'Войти'}</span>
          </button>
        </form>

        <div className="mt-6 text-center border-t border-border pt-4">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-xs font-medium text-brand hover:underline min-h-[44px]"
          >
            {isRegistering
              ? 'Уже есть аккаунт? Войти'
              : 'Впервые в клубе? Создать аккаунт'}
          </button>
        </div>
      </div>
    </div>
  );
}
