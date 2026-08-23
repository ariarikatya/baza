'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { FileUploader } from '@/components/FileUploader';
import { Building, Send, CheckCircle2 } from 'lucide-react';

export default function ClubRegisterPage() {
  const router = useRouter();
  const [clubName, setClubName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const clubData = {
        id: 'club_' + Date.now(),
        name: clubName,
        tagline,
        address,
        phone,
        workingHours: 'Ежедневно 16:00 - 05:00',
        description,
        logoUrl,
      };

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: 'КЛУБ',
          action: 'write',
          data: clubData,
        }),
      });

      setSubmitted(true);
      setTimeout(() => {
        router.push('/home');
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Регистрация Клуба / Филиала</h1>
            <p className="text-xs text-muted-foreground">Форма внесения информации о клубе в систему "БАЗА"</p>
          </div>
        </div>

        {submitted ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
            <h2 className="text-xl font-bold text-foreground">Клуб успешно зарегистрирован!</h2>
            <p className="text-sm text-muted-foreground">Перенаправление на главную страницу...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Название Клуба</label>
              <input
                type="text"
                required
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Покерный Клуб БАЗА"
                className="w-full mt-1 px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-brand focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Слоган / Описание кратко</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Место встречи профессионалов"
                className="w-full mt-1 px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-brand focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Адрес</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="г. Москва, ул. Тверская, 15"
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
                  placeholder="+7 (495) 000-77-88"
                  className="w-full mt-1 px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-brand focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Подробное описание</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Расскажите о столах, правилах и особенностях вашего клуба..."
                className="w-full mt-1 px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-brand focus:outline-none"
              />
            </div>

            <FileUploader
              label="Логотип / Обложка Клуба"
              onUploadComplete={(url) => setLogoUrl(url)}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-brand text-white py-3 rounded-xl font-semibold hover:bg-brand-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Send className="w-5 h-5" />
              <span>{loading ? 'Сохранение...' : 'Зарегистрировать Клуб'}</span>
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
