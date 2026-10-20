'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploader } from '@/components/FileUploader';
import { PlayerRow } from '@/types';
import { saveUserSession } from '@/lib/session';
import { checkNicknameUniqueness } from '@/lib/calculations';
import { useClubLogo, DEFAULT_CLUB_LOGO } from '@/lib/useClubLogo';
import { User, Lock, Phone, ArrowRight, BookOpen } from 'lucide-react';

const RULES_PDF_URL = 'https://storage.googleapis.com/glide-proprod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/VvUZFtDqb4Lc9iJ42A7H.pdf';

export default function LoginPage() {
  const router = useRouter();
  const clubLogoUrl = useClubLogo();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Form State
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [agreedToRules, setAgreedToRules] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const logs = JSON.parse(localStorage.getItem('baza_session_debug') || '[]');
        setDebugLogs(logs);
      } catch (e) {}
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/sheets?sheet=Игроки');
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        const players: PlayerRow[] = data.data;
        
        const normalizedNick = nick.trim().toLowerCase();
        // Пароль принимается в любой раскладке (включая кириллицу) без нормализации/транслитерации
        const rawPassword = password;

        const player = players.find((p) => {
          const playerNick = String(p['Ник'] || '').trim().toLowerCase();
          const playerPassword = String(p['Пароль'] || '');
          
          return playerNick === normalizedNick && playerPassword === rawPassword;
        });

        if (player) {
          const isBanned =
            player['Бан'] === true ||
            String(player['Бан'] || '').toLowerCase() === 'true' ||
            String(player['Бан'] || '') === '1';

          if (isBanned) {
            setError('Ваш аккаунт заблокирован администрацией клуба.');
            setLoading(false);
            return;
          }

          await fetch('/api/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sheetName: 'Игроки',
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

          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          const playerId = player['User ID'] || `p_${Date.now()}`;
          const expectedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${baseUrl}/results?playerId=${encodeURIComponent(playerId)}&nick=${encodeURIComponent(player['Ник'])}`)}`;

          const savedQr = String(player['QR URL'] || player['QR'] || '');
          const isQrValid = (() => {
            if (!savedQr || !savedQr.startsWith('http') || !savedQr.includes('/results?playerId=')) return false;
            try {
              let targetUrlStr = savedQr;
              if (savedQr.includes('data=')) {
                const urlObj = new URL(savedQr);
                const dataParam = urlObj.searchParams.get('data');
                if (dataParam) targetUrlStr = dataParam;
              }
              const innerUrl = new URL(targetUrlStr.startsWith('http') ? targetUrlStr : `https://dummy.com${targetUrlStr.startsWith('/') ? '' : '/'}${targetUrlStr}`);
              const qPlayerId = innerUrl.searchParams.get('playerId');
              const qNick = innerUrl.searchParams.get('nick');
              return qPlayerId === playerId && qNick === player['Ник'];
            } catch (e) {
              return false;
            }
          })();

          const updatedPlayerData = {
            ...player,
            'User ID': playerId,
            'QR': isQrValid ? player['QR'] || expectedQrUrl : expectedQrUrl,
            'QR URL': isQrValid ? player['QR URL'] || expectedQrUrl : expectedQrUrl,
            'Авторизован?': true,
            'Онлайн': true,
          };

          fetch('/api/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sheetName: 'Игроки',
              action: 'update',
              keyName: 'Ник',
              keyValue: player['Ник'],
              rowData: updatedPlayerData,
            }),
          }).catch((err) => console.error('Failed to sync login QR:', err));

          // Set server-side session cookie via POST /api/auth/session anchor
          fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: playerId }),
          }).catch((err) => console.error('Failed to set server session cookie:', err));

          saveUserSession(updatedPlayerData);
          router.replace('/home');
          return;
        }
      }

      setError('Неверный никнейм или пароль.');
    } catch (err) {
      console.error('Login error:', err);
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
      const res = await fetch('/api/sheets?sheet=Игроки');
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        const isUnique = checkNicknameUniqueness(nick, data.data);
        if (!isUnique) {
          setError('Этот никнейм уже занят, попробуйте другой!');
          setLoading(false);
          return;
        }
      }

      const userId = `p_${Date.now()}`;
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const resultPageUrl = `${baseUrl}/results?playerId=${encodeURIComponent(userId)}&nick=${encodeURIComponent(nick.trim())}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(resultPageUrl)}`;

      const newPlayer: PlayerRow = {
        'Ник': nick.trim(),
        'Пароль': password,
        'Имя': name.trim(),
        'Роль': '',
        'Email': `${nick.trim().toLowerCase()}@baza.ru`,
        'Аватар': avatar || '',
        'Бан': false,
        'Авторизован?': true,
        'Telegram ID': '',
        'Анимация?': true,
        'Админ?': false,
        'User ID': userId,
        'Общий рейтинг': 1000,
        'Статус': '👤',
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

      const writeRes = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'Игроки',
          action: 'append',
          rowData: newPlayer,
        }),
      });
      
      const writeData = await writeRes.json();
      console.log('Register write result:', writeData);

      if (!writeData.success) {
        throw new Error(writeData.error || 'Failed to write to sheet');
      }

      // Set server-side session cookie via POST /api/auth/session anchor
      fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).catch((err) => console.error('Failed to set server session cookie:', err));

      saveUserSession(newPlayer);
      router.replace('/home');
    } catch (err) {
      console.error('Register error:', err);
      setError('Ошибка при регистрации. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex flex-col justify-center items-center p-4 pt-safe pb-safe">
      <div className="w-full max-w-md bg-gray-900/90 border border-gray-800 p-8 rounded-2xl shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col items-center mb-6">
          <img
            src={clubLogoUrl}
            alt="БАЗА"
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_CLUB_LOGO; }}
            className="w-20 h-20 rounded-full border-2 border-[#014373] mb-3 object-cover shadow-lg shadow-[#014373]/30"
          />
          <h2 className="text-2xl font-bold tracking-wide text-center">
            {isRegistering ? 'РЕГИСТРАЦИЯ ИГРОКА' : 'ВХОД В КЛУБ БАЗА'}
          </h2>
          <p className="text-xs text-gray-400 mt-1 text-center">
            {isRegistering ? 'Создайте профиль для участия в турнирах' : 'Введите ваши данные для входа'}
          </p>
        </div>

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
            <label className="block text-xs text-gray-400 mb-1">Пароль *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#014373] transition"
              />
            </div>
          </div>

          {isRegistering && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Имя</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Алексей"
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
                <label className="block text-xs text-gray-400 mb-1">Аватар</label>
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
                <label htmlFor="agreedToRules" className="text-xs text-gray-300 cursor-pointer leading-tight">
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
                <span>{isRegistering ? 'Зарегистрироваться' : 'Войти в клуб'}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-800 pt-4">
          <button
            type="button"
            onClick={() => {
              setIsRegistering((v) => {
                setPassword('');
                return !v;
              });
              setError('');
              setNick('');
            }}
            className="text-xs text-gray-400 hover:text-white transition"
          >
            {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>

        {/* Development Session Debug Dump */}
        {debugLogs.length > 0 && (
          <div className="mt-6 pt-3 border-t border-gray-800 text-[10px] font-mono text-gray-500 break-all select-all">
            <div className="font-bold text-gray-400 mb-1">🛠 Session Debug Log:</div>
            {debugLogs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
