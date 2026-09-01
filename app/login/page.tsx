'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploader } from '@/components/FileUploader';
import { PlayerRow } from '@/types';
import { User, Lock, Phone, ArrowRight, BookOpen } from 'lucide-react';

const CLUB_LOGO = 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/P501EvW31guuymrmZYZM.jpg';
const RULES_PDF_URL = 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/VvUZFtDqb4Lc9iJ42A7H.pdf';

export default function LoginPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [agreedToRules, setAgreedToRules] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/sheets?sheet=ИГРОКИ');
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        const players: PlayerRow[] = data.data;
        const player = players.find(
          (p) =>
            p['Ник']?.toLowerCase().trim() === nick.toLowerCase().trim() &&
            p['Пароль'] === password
        );

        if (player) {
          if (player['Бан']) {
            setError('Ваш аккаунт заблокирован администрацией клуба.');
            setLoading(false);
            return;
          }

          // Mark as authorized in Google Sheets
          await fetch('/api/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sheetName: 'ИГРОКИ',
              action: 'update',
              keyName: 'Ник',
              keyValue: player['Ник'],
              rowData: {
                ...player,
                'Авторизован?': true,
                'Онлайн': true,
              },
            }),
          });

          const authenticatedUser = {
            ...player,
            'Авторизован?': true,
          };

          localStorage.setItem('baza_user', JSON.stringify(authenticatedUser));
          router.push('/home');
          return;
        }
      }

      setError('Неверный никнейм или пароль');
    } catch (err) {
      setError('Ошибка подключения к серверу. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToRules) {
      setError('Необходимо подтвердить возраст 18+ и согласиться с правилами клуба');
      return;
    }

    if (!nick.trim() || !phone.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check uniqueness of Nickname
      const res = await fetch('/api/sheets?sheet=ИГРОКИ');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const existingPlayer = data.data.find(
          (p: PlayerRow) => p['Ник']?.trim().toLowerCase() === nick.trim().toLowerCase()
        );
        if (existingPlayer) {
          setError('Ник занят, попробуйте другой!');
          setLoading(false);
          return;
        }
      }

      const userId = `p_${Date.now()}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(nick)}`;

      const newPlayer: PlayerRow = {
        'Ник': nick.trim(),
        'Пароль': password,
        'Имя': name.trim(),
        'Роль': 'Игрок',
        'Email': `${nick.trim().toLowerCase()}@baza.ru`,
        'Аватар': avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        'Бан': false,
        'Авторизован?': true,
        'Telegram ID': '',
        'Анимация?': true,
        'Админ?': false,
        'User ID': userId,
        'Общий рейтинг': 1000,
        'Статус': 'ИГРОК',
        'Место': 99,
        'QR': qrUrl,
        'QR URL': qrUrl,
        'Онлайн': true,
        'Играет?': false,
        'Авторизация шаги': '3/3',
        'Соглашение о правилах': true,
        'Выбранный сезон': 'Текущий',
        'Номер телефона': phone,
        'Выбранный Игрок': nick.trim(),
        '🔒 Row ID': `row_${userId}`,
      };

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'ИГРОКИ',
          action: 'append',
          rowData: newPlayer,
        }),
      });

      localStorage.setItem('baza_user', JSON.stringify(newPlayer));
      router.push('/home');
    } catch (err) {
      setError('Ошибка при регистрации. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-gray-900/90 border border-gray-800 p-8 rounded-2xl shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col items-center mb-6">
          <img
            src={CLUB_LOGO}
            alt="БАЗА"
            className="w-20 h-20 rounded-full border-2 border-[#014373] mb-3 object-cover shadow-lg shadow-[#014373]/30"
          />
          <h2 className="text-2xl font-bold tracking-wide">
            {isRegistering ? 'РЕГИСТРАЦИЯ ИГРОКА' : 'ВХОД В КЛУБ БАЗА'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {isRegistering ? 'Создайте профиль для участия в турнирах' : 'Введите ваши данные для входа'}
          </p>
        </div>

        {/* Rules button */}
        <div className="mb-4 text-center">
          <a
            href={RULES_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-blue-300 rounded-lg border border-gray-700 transition"
          >
            <BookOpen className="w-4 h-4 text-[#014373]" />
            <span>Правила клуба (Открыть PDF)</span>
          </a>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-200 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Никнейм *</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
              <input
                type="text"
                required
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                placeholder="Ваш ник"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#014373] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Пароль (любые символы) *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#014373] transition"
              />
            </div>
          </div>

          {isRegistering && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Имя и Фамилия</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Алексей Смирнов"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#014373] transition"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Номер телефона *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#014373] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Аватар (загрузка ImgBB)</label>
                <FileUploader onUploadComplete={(url) => setAvatar(url)} />
              </div>

              <div className="flex items-start space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="agreedToRules"
                  required
                  checked={agreedToRules}
                  onChange={(e) => setAgreedToRules(e.target.checked)}
                  className="mt-1 shrink-0 w-4 h-4 text-[#014373] rounded border-gray-700 bg-gray-800 focus:ring-[#014373]"
                />
                <label htmlFor="agreedToRules" className="text-xs text-gray-300 cursor-pointer">
                  Я подтверждаю что мне есть 18 лет и согласен с правилами клуба БАЗА ({' '}
                  <a
                    href={RULES_PDF_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#014373] underline font-semibold hover:text-blue-400"
                  >
                    Открыть правила PDF
                  </a>
                  ).
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              (isRegistering && (!nick.trim() || !agreedToRules || !phone.trim()))
            }
            className="w-full min-h-[44px] bg-[#014373] hover:bg-[#013357] text-white font-semibold rounded-lg flex items-center justify-center transition shadow-lg shadow-[#014373]/30 disabled:opacity-50 mt-6"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="flex items-center space-x-2">
                <span>{isRegistering ? 'Регистрация' : 'Войти в клуб'}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-800 pt-4">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-xs text-gray-400 hover:text-white transition"
          >
            {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </div>
  );
}
