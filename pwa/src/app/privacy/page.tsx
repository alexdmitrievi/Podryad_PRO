export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-extrabold text-[#2d35a8]">
            Подряд PRO
          </span>
          <a
            href="/"
            className="bg-[#2d35a8] text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-[#252ca0] transition-colors cursor-pointer"
          >
            На главную
          </a>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-heading text-3xl font-extrabold text-gray-900 mb-2">
          Политика конфиденциальности
        </h1>
        <p className="text-gray-500 text-sm mb-10">
          Дата последнего обновления: 2 апреля 2026 г.
        </p>

        {/* 1. Общие положения */}
        <section className="mb-10">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-4">
            1. Общие положения
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки
            и защиты персональных данных пользователей сервиса Подряд PRO, расположенного по адресу{' '}
            <a href="https://podryadpro.ru" className="text-[#2d35a8] underline hover:no-underline">
              podryadpro.ru
            </a>{' '}
            (далее — «Сервис», «Платформа»).
          </p>
          <p className="text-gray-700 leading-relaxed mb-3">
            Оператором персональных данных является:
          </p>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-gray-700 text-sm leading-relaxed space-y-1">
            <p><strong>ИП Жбанков Алексей Дмитриевич</strong></p>
            <p>ИНН: 550516401202</p>
            <p>Адрес: г. Омск</p>
            <p>
              Телефон:{' '}
              <a href="tel:+79136691665" className="text-[#2d35a8] hover:underline">
                +7-913-669-16-65
              </a>
            </p>
            <p>
              Сайт:{' '}
              <a href="https://podryadpro.ru" className="text-[#2d35a8] hover:underline">
                podryadpro.ru
              </a>
            </p>
          </div>
          <p className="text-gray-700 leading-relaxed mt-3">
            Используя Сервис, вы даёте согласие на обработку своих персональных данных в соответствии
            с настоящей Политикой. Если вы не согласны с условиями Политики, пожалуйста, воздержитесь
            от использования Сервиса.
          </p>
          <p className="text-gray-700 leading-relaxed mt-3">
            Обработка персональных данных осуществляется в соответствии с требованиями Федерального
            закона от 27.07.2006 № 152-ФЗ «О персональных данных» и иными применимыми нормативными
            актами Российской Федерации.
          </p>
        </section>

        {/* 2. Цели обработки */}
        <section className="mb-10">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-4">
            2. Цели обработки персональных данных
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Оператор обрабатывает персональные данные в следующих целях:
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 pl-2">
            <li>регистрация и авторизация пользователей на Платформе;</li>
            <li>исполнение договоров между заказчиками и исполнителями, сопровождение сделок;</li>
            <li>приём и обработка платежей через платёжный сервис ЮKassa;</li>
            <li>выплата вознаграждений исполнителям (самозанятым и ИП);</li>
            <li>обработка заявок (лидов) от потенциальных заказчиков;</li>
            <li>уведомление пользователей об изменениях статусов заказов и иных событиях;</li>
            <li>техническая поддержка пользователей;</li>
            <li>соблюдение требований законодательства Российской Федерации;</li>
            <li>улучшение качества работы Сервиса и пользовательского опыта.</li>
          </ul>
        </section>

        {/* 3. Правовые основания */}
        <section className="mb-10">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-4">
            3. Правовые основания обработки
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Обработка персональных данных осуществляется на следующих правовых основаниях:
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 pl-2">
            <li>согласие субъекта персональных данных (ст. 6, ч. 1, п. 1 ФЗ-152);</li>
            <li>исполнение договора, стороной которого является субъект персональных данных (ст. 6, ч. 1, п. 5 ФЗ-152);</li>
            <li>выполнение требований законодательства Российской Федерации (ст. 6, ч. 1, п. 2 ФЗ-152);</li>
            <li>законный интерес Оператора в целях обеспечения работы Сервиса.</li>
          </ul>
        </section>

        {/* 4. Перечень ПД */}
        <section className="mb-10">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-4">
            4. Перечень обрабатываемых персональных данных
          </h2>

          <h3 className="font-heading text-base font-bold text-gray-800 mb-2 mt-4">
            4.1. Данные заказчиков
          </h3>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1 pl-2 mb-4">
            <li>фамилия, имя, отчество;</li>
            <li>номер телефона;</li>
            <li>адрес электронной почты;</li>
            <li>город (населённый пункт);</li>
            <li>описание задачи и параметры заказа;</li>
            <li>данные платёжной карты (в зашифрованном виде через ЮKassa — Оператор не хранит данные карт).</li>
          </ul>

          <h3 className="font-heading text-base font-bold text-gray-800 mb-2">
            4.2. Данные исполнителей (рабочие, бригады)
          </h3>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1 pl-2 mb-4">
            <li>фамилия, имя, отчество;</li>
            <li>номер телефона;</li>
            <li>ИНН (для самозанятых и ИП);</li>
            <li>реквизиты банковской карты для выплат (токенизированный синоним через ЮKassa);</li>
            <li>специальность, категория услуг, город.</li>
          </ul>

          <h3 className="font-heading text-base font-bold text-gray-800 mb-2">
            4.3. Технические данные
          </h3>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1 pl-2">
            <li>IP-адрес устройства;</li>
            <li>данные cookie-файлов и сессий;</li>
            <li>технические параметры браузера и устройства;</li>
            <li>журналы действий (логи).</li>
          </ul>
        </section>

        {/* 5. Сроки хранения */}
        <section className="mb-10">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-4">
            5. Сроки хранения персональных данных
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Персональные данные хранятся не дольше, чем этого требуют цели их обработки:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-700 border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold">Категория данных</th>
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold">Срок хранения</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 border border-gray-200">Данные заказов и платежей</td>
                  <td className="px-3 py-2 border border-gray-200">5 лет (требования налогового законодательства)</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 border border-gray-200">Профиль пользователя</td>
                  <td className="px-3 py-2 border border-gray-200">До удаления аккаунта + 1 год</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 border border-gray-200">Заявки (лиды)</td>
                  <td className="px-3 py-2 border border-gray-200">1 год с момента подачи заявки</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 border border-gray-200">Технические логи</td>
                  <td className="px-3 py-2 border border-gray-200">90 дней</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-gray-700 leading-relaxed mt-3">
            После истечения срока хранения данные уничтожаются или обезличиваются.
          </p>
        </section>

        {/* 6. Права субъекта */}
        <section className="mb-10">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-4">
            6. Права субъекта персональных данных
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            В соответствии с ФЗ-152 вы вправе:
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 pl-2">
            <li><strong>получить информацию</strong> о том, какие ваши данные обрабатываются Оператором;</li>
            <li><strong>исправить</strong> неточные или устаревшие данные;</li>
            <li><strong>удалить</strong> персональные данные (в случаях, предусмотренных законом);</li>
            <li><strong>отозвать согласие</strong> на обработку данных — направив заявку Оператору;</li>
            <li><strong>ограничить обработку</strong> данных в случаях, предусмотренных ФЗ-152;</li>
            <li><strong>обратиться</strong> в Роскомнадзор (rkn.gov.ru) в случае нарушения ваших прав.</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            Для реализации своих прав направьте запрос на контакты, указанные в разделе 10.
          </p>
        </section>

        {/* 7. Передача третьим лицам */}
        <section className="mb-10">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-4">
            7. Передача данных третьим лицам
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Оператор передаёт персональные данные следующим третьим лицам исключительно в той мере,
            которая необходима для работы Сервиса:
          </p>

          <h3 className="font-heading text-base font-bold text-gray-800 mb-2 mt-4">
            7.1. ЮKassa (ООО НКО «Яндекс.Деньги»)
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Платёжный сервис для приёма и выплаты средств. Передаются: ФИО, телефон, реквизиты
            для выплат, сумма транзакции. Обработка производится в соответствии с политикой
            конфиденциальности ЮKassa (yookassa.ru).
          </p>

          <h3 className="font-heading text-base font-bold text-gray-800 mb-2">
            7.2. Supabase (Supabase Inc., США)
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Облачная база данных для хранения данных Сервиса. Серверы расположены в регионах AWS
            (EU West). Передача данных осуществляется в рамках соглашения об обработке данных (DPA)
            с Supabase. Подробнее: supabase.com/privacy.
          </p>

          <p className="text-gray-700 leading-relaxed">
            Оператор <strong>не продаёт</strong> и <strong>не передаёт</strong> персональные данные
            третьим лицам в коммерческих целях, за исключением случаев, прямо предусмотренных
            настоящей Политикой или требованиями законодательства.
          </p>
        </section>

        {/* 8. Cookies */}
        <section className="mb-10">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-4">
            8. Использование файлов cookie
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Сервис использует файлы cookie и аналогичные технологии для обеспечения
            работоспособности Платформы, сохранения сессий пользователей и улучшения
            пользовательского опыта.
          </p>
          <p className="text-gray-700 leading-relaxed mb-3">
            Типы используемых cookie:
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 pl-2">
            <li><strong>Необходимые</strong> — обеспечивают базовую функциональность (авторизация, сессия);</li>
            <li><strong>Функциональные</strong> — сохраняют настройки пользователя (город, предпочтения).</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            Вы можете отключить cookie в настройках браузера. Обратите внимание: отключение
            необходимых cookie может нарушить работу Сервиса.
          </p>
        </section>

        {/* 9. Безопасность */}
        <section className="mb-10">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-4">
            9. Безопасность персональных данных
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Оператор принимает организационные и технические меры для защиты персональных данных:
          </p>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 pl-2">
            <li>все данные передаются по зашифрованному протоколу <strong>HTTPS / SSL (TLS 1.2+)</strong>;</li>
            <li>доступ к базе данных ограничен по IP и защищён аутентификацией;</li>
            <li>данные платёжных карт не хранятся на серверах Оператора — обрабатываются только ЮKassa;</li>
            <li>регулярное резервное копирование данных;</li>
            <li>ограниченный доступ к персональным данным (принцип минимальных привилегий).</li>
          </ul>
        </section>

        {/* 10. Контакты */}
        <section className="mb-10">
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-4">
            10. Контакты оператора
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            По вопросам обработки персональных данных обращайтесь к Оператору:
          </p>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-gray-700 text-sm leading-relaxed space-y-1">
            <p><strong>ИП Жбанков Алексей Дмитриевич</strong></p>
            <p>ИНН: 550516401202</p>
            <p>г. Омск</p>
            <p>
              Телефон:{' '}
              <a href="tel:+79136691665" className="text-[#2d35a8] hover:underline">
                +7-913-669-16-65
              </a>
            </p>
            <p>
              Сайт:{' '}
              <a href="https://podryadpro.ru" className="text-[#2d35a8] hover:underline">
                podryadpro.ru
              </a>
            </p>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            Оператор рассматривает обращения в течение 30 дней с момента получения.
          </p>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0f1129] py-8 px-4 text-center">
        <p className="text-gray-400 text-sm mb-1">
          &copy; {new Date().getFullYear()} ИП Жбанков Алексей Дмитриевич. ИНН 550516401202. г. Омск.
        </p>
        <p className="text-gray-500 text-sm">
          <a href="/privacy" className="hover:text-gray-300 transition-colors">
            Политика конфиденциальности
          </a>
        </p>
      </footer>
    </div>
  );
}
