'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, ExternalLink, ShieldCheck, AlertCircle, Lock } from 'lucide-react';

export default function RulesPage() {
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:ready'));
    }
  }, []);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-white p-4 sm:p-6 pt-safe pb-safe">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between gap-4 bg-gray-900/90 border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 sm:p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl border border-gray-700 transition flex items-center justify-center shrink-0 min-h-[40px] min-w-[40px]"
              aria-label="Назад"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2.5 bg-[#014373]/20 text-[#014373] rounded-xl hidden sm:flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                ПРАВИЛА КЛУБА «БАЗА»
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Редакция от 13.02.2026
              </p>
            </div>
          </div>
        </div>

        {/* Intro */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-lg text-sm text-gray-300 leading-relaxed space-y-3">
          <p>
            Настоящий документ устанавливает порядок посещения и участия в мероприятиях Клуба. Соблюдение правил обеспечивает комфортную и безопасную среду для всех гостей.
          </p>
          <p>
            Администрация вправе изменять условия с публикацией актуальной версии в Приложении.
          </p>
        </div>

        {/* Attention Callout */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-lg space-y-2">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-base">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>📢 Внимание!</span>
          </div>
          <p className="text-sm text-amber-200/90 leading-relaxed pl-7">
            Настоящие Правила являются публичной офертой. Используя Приложение или нажимая кнопку «Старт» в боте, вы подтверждаете свой Акцепт (полное согласие) с условиями ниже.
          </p>
        </div>

        {/* Confidentiality Callout */}
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-5 sm:p-6 shadow-lg space-y-3">
          <div className="flex items-center gap-2.5 text-sky-400 font-bold text-base">
            <Lock className="w-5 h-5 shrink-0" />
            <span>🔒 Конфиденциальность:</span>
          </div>
          <ul className="text-sm text-sky-100/90 leading-relaxed pl-7 space-y-1.5 list-disc list-inside">
            <li>Данный сервис не собирает ваши персональные данные (ФИО, паспорт, адрес).</li>
            <li>Сбор вашего Telegram ID и псевдонима (Ник) осуществляется исключительно на добровольной основе для обеспечения игрового процесса и ведения рейтинга.</li>
            <li>Мы используем файлы Cookie, чтобы обеспечить корректную работу приложения и избавить вас от необходимости повторной авторизации.</li>
            <li>Начиная игру, вы даете безусловное согласие на обработку указанных технических данных.</li>
          </ul>
        </div>

        {/* Section 1 */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
            1. Термины
          </h2>
          <div className="text-sm text-gray-300 leading-relaxed pl-7 space-y-2">
            <p><span className="font-semibold text-white">Клуб («База»)</span> — организатор мероприятий (ИП Аникеев Михаил Александрович (ИНН 640402053205 ОгРНИП 326645700013188))</p>
            <p><span className="font-semibold text-white">Администрация</span> — представители Клуба, отвечающие за проведение мероприятий и соблюдение порядка.</p>
            <p><span className="font-semibold text-white">Мероприятие</span> — турнир по покеру развлекательного формата. Не является азартной игрой, лотереей или пари: отсутствуют ставки, риск утраты средств и имущественные выигрыши.</p>
            <p><span className="font-semibold text-white">Участник</span> — совершеннолетнее дееспособное лицо, принявшее условия Правил и допущенное к игре.</p>
            <p><span className="font-semibold text-white">Организационный взнос</span> — фиксированная плата (1000 ₽) за услуги Клуба. Не является ставкой, не формирует призовой фонд и не подлежит возврату.</p>
            <p><span className="font-semibold text-white">Игровые фишки</span> — инвентарь для определения турнирного результата. Не имеют денежной стоимости, не обмениваются на деньги, товары или услуги.</p>
            <p><span className="font-semibold text-white">Услуги Клуба</span> — организация турнира, аренда оборудования (столы, карты, фишки), работа персонала, создание досуговых условий.</p>
            <p><span className="font-semibold text-white">Приложение</span> — интерфейс на платформе Glide для записи на игры и ознакомления с Правилами. Участник указывает псевдоним, не позволяющий установить личность (персональные данные не обрабатываются).</p>
            <p><span className="font-semibold text-white">Акцепт</span> — полное согласие с Правилами, подтвержденное отметкой в Приложении.</p>
          </div>
        </div>

        {/* Section 2 */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
            2. Общие положения
          </h2>
          <div className="text-sm text-gray-300 leading-relaxed pl-7 space-y-2">
            <p>2.1. Правила регулируют взаимодействие между Клубом и Участником.</p>
            <p>2.2. Все мероприятия проводятся исключительно в спортивно-развлекательном формате, без проведения азартных игр.</p>
            <p>2.3. Запрещены: игра на деньги, формирование призовых фондов, выплата выигрышей, рейк, кеш-игры и любые формы извлечения прибыли из процесса.</p>
            <p>2.4. Акцепт наступает при последовательном выполнении двух действий:<br />— проставление отметки о согласии в Приложении;<br />— оплата организационного взноса.</p>
          </div>
        </div>

        {/* Section 3 */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
            3. Порядок участия
          </h2>
          <div className="text-sm text-gray-300 leading-relaxed pl-7 space-y-2">
            <p>3.1. Участник вносит организационный взнос 1000 ₽ — это плата за комплекс услуг, а не за возможность выигрыша.</p>
            <p>3.2. Игровые фишки выдаются во временное пользование, служат исключительно для определения победителя и не имеют номинала.</p>
            <p>3.3. Клуб вправе вести рейтинговую систему. Баллы начисляются за участие, не влияют на объем услуг и не создают обязательств со стороны Клуба.</p>
          </div>
        </div>

        {/* Section 4 */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
            4. Прекращение участия
          </h2>
          <div className="text-sm text-gray-300 leading-relaxed pl-7 space-y-2">
            <p>4.1. Услуга считается оказанной, а аренда оборудования завершенной в случаях:<br />— проигрыш всех фишек;<br />— победа в турнире;<br />— добровольный выход;<br />— решение Администрации об отстранении.</p>
            <p>4.2. Администрация вправе в одностороннем порядке прекратить оказание услуг и удалить из клуба участника, нарушающего правила, общественный порядок или мешающего окружающим. Взнос в таких случаях не возвращается.</p>
          </div>
        </div>

        {/* Section 5 */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
            5. Поведение
          </h2>
          <div className="text-sm text-gray-300 leading-relaxed pl-7 space-y-2">
            <p>5.1. Участник обязан соблюдать законодательство РФ, нормы этики и уважать личные границы других гостей.</p>
            <p>5.2. Каждый вправе проводить время с комфортом, если это не мешает остальным.</p>
            <p>5.3. Запрещены агрессия, оскорбления, мошенничество, провокации и любые действия, направленные на срыв мероприятия.</p>
          </div>
        </div>

        {/* Section 6 */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
            6. Ответственность и споры
          </h2>
          <div className="text-sm text-gray-300 leading-relaxed pl-7 space-y-2">
            <p>6.1. Клуб не отвечает за сохранность личных вещей.</p>
            <p>6.2. Все разногласия решаются переговорами. При недостижении согласия — в судебном порядке по месту нахождения Клуба.</p>
            <p>6.3. Актуальная редакция Правил всегда доступна в Приложении.</p>
          </div>
        </div>

        {/* Organizer details */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-lg text-xs sm:text-sm text-gray-300 leading-relaxed">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Организатор: ИП Аникеев Михаил Александрович</span>
            <span>ИНН: 640402053205</span>
            <span>ОГРНИП: 326645700013188</span>
            <span className="inline-flex items-center gap-1">
              Ссылка для связи:{' '}
              <a
                href="https://t.me/Baza380215"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline font-semibold inline-flex items-center gap-0.5"
              >
                https://t.me/Baza380215
                <ExternalLink className="w-3.5 h-3.5 ml-0.5 inline" />
              </a>
            </span>
          </p>
        </div>

        {/* Bottom Back Button */}
        <div className="pt-2 pb-6 text-center">
          <button
            onClick={handleBack}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-sm font-semibold text-gray-200 rounded-xl border border-gray-700 transition"
          >
            ← Вернуться назад
          </button>
        </div>
      </div>
    </div>
  );
}
