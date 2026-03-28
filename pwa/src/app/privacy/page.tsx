import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — Подряд PRO',
  description: 'Политика обработки персональных данных в соответствии с 152-ФЗ',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <div className="bg-gradient-to-r from-brand-900 to-brand-600 text-white px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            На главную
          </Link>
          <h1 className="text-xl font-bold mt-2 flex items-center gap-2">
            <Shield size={24} />
            Политика конфиденциальности
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-dark-border shadow-sm space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">1. Общие положения</h2>
            <p>
              Настоящая Политика конфиденциальности персональных данных (далее — Политика)
              действует в отношении всей информации, которую сервис «Подряд PRO» (далее — Сервис)
              может получить о пользователе во время использования сайта и мобильного приложения.
            </p>
            <p className="mt-2">
              Использование Сервиса означает согласие пользователя с настоящей Политикой
              и указанными в ней условиями обработки персональных данных.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">2. Оператор персональных данных</h2>
            <p className="font-medium text-gray-900 dark:text-white mb-2">Оператор:</p>
            <ul className="space-y-1 pl-4">
              <li><span className="text-gray-500 dark:text-gray-400">Наименование:</span> ИП Жбанков Алексей Дмитриевич</li>
              <li><span className="text-gray-500 dark:text-gray-400">ИНН:</span> 550516401202</li>
              <li><span className="text-gray-500 dark:text-gray-400">ОГРНИП:</span> 322554300070581</li>
              <li><span className="text-gray-500 dark:text-gray-400">Юридический адрес:</span> 644041, Омск, ул. Кирова, 51, квартира 8</li>
              <li><span className="text-gray-500 dark:text-gray-400">Email:</span> <a href="mailto:ipzhbankov@yandex.ru" className="text-brand-600 hover:underline">ipzhbankov@yandex.ru</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">3. Сбор персональных данных</h2>
            <p className="font-medium text-gray-900 dark:text-white mb-2">Сервис собирает следующие персональные данные:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>номер телефона — для связи по заказу и отправки каталога;</li>
              <li>адрес электронной почты — для регистрации и уведомлений;</li>
              <li>адрес доставки/работ — для выполнения заказа;</li>
              <li>информация о заказах — для обработки заявок.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">4. Цели обработки данных</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>обработка заказов и заявок пользователей;</li>
              <li>связь с пользователем по заказу;</li>
              <li>отправка каталогов и коммерческих предложений;</li>
              <li>предоставление доступа к функционалу Сервиса;</li>
              <li>обратная связь и поддержка пользователей.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">5. Правовые основания обработки</h2>
            <p>
              Обработка персональных данных осуществляется на основании:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>согласия субъекта персональных данных (ст. 9 ФЗ-152);</li>
              <li>необходимости исполнения договора (ст. 6 ФЗ-152);</li>
              <li>законных интересов оператора (ст. 6 ФЗ-152).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">6. Сроки хранения данных</h2>
            <p>
              Персональные данные хранятся в течение срока, необходимого для достижения целей
              обработки, но не более 3 лет с момента последнего взаимодействия с пользователем,
              если законодательством не предусмотрен иной срок.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">7. Передача данных третьим лицам</h2>
            <p>
              Сервис не передаёт персональные данные третьим лицам, за исключением случаев:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>передачи исполнителям заказа (только необходимая информация);</li>
              <li>требований законодательства РФ;</li>
              <li>необходимости защиты прав и законных интересов Сервиса.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">8. Защита данных</h2>
            <p>
              Оператор принимает необходимые организационные и технические меры для защиты
              персональных данных от неправомерного доступа, уничтожения, изменения, блокирования,
              копирования, распространения, а также от иных неправомерных действий.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">9. Права субъекта ПД</h2>
            <p>Пользователь имеет право:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>получить информацию о своих персональных данных;</li>
              <li>требовать уточнения, блокирования или уничтожения данных;</li>
              <li>отозвать согласие на обработку данных;</li>
              <li>обжаловать действия оператора в уполномоченный орган (Роскомнадзор).</li>
            </ul>
            <p className="mt-3">
              Для реализации прав обращайтесь по email:{' '}
              <a href="mailto:ipzhbankov@yandex.ru" className="text-brand-600 hover:underline">
                ipzhbankov@yandex.ru
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">10. Изменение Политики</h2>
            <p>
              Оператор оставляет за собой право вносить изменения в настоящую Политику.
              Новая редакция Политики вступает в силу с момента её размещения на сайте,
              если иное не предусмотрено новой редакцией.
            </p>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Дата последнего обновления: 28 марта 2026 г.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
