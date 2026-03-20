export const NOTIFICATIONS = {
  // Заказчику
  ORDER_CONFIRMED: {
    title: '✅ Заказ принят',
    body: 'Заказ #{order_id} принят. Ожидайте исполнителя.',
    url: '/customer',
  },
  EXECUTOR_FOUND: {
    title: '🎉 Исполнитель найден!',
    body: '{worker_name} взял ваш заказ #{order_id}',
    url: '/customer',
  },
  WORK_COMPLETED: {
    title: '✅ Работа выполнена',
    body: 'Заказ #{order_id} выполнен. Оцените исполнителя.',
    url: '/customer',
  },
  REFUND_ISSUED: {
    title: '↩️ Возврат средств',
    body: 'Возврат {amount}₽ за заказ #{order_id} оформлен.',
    url: '/customer',
  },

  // Исполнителю
  NEW_ORDER: {
    title: '📢 Новый заказ!',
    body: '{work_type}, {address} — {worker_payout}₽',
    url: '/dashboard',
  },
  ORDER_ASSIGNED: {
    title: '🎉 Заказ ваш!',
    body: 'Заказ #{order_id} назначен вам. Детали в приложении.',
    url: '/worker',
  },
  RATING_RECEIVED: {
    title: '⭐ Новая оценка',
    body: 'Оценка {score}/5 за заказ #{order_id}. Рейтинг: {rating}',
    url: '/worker',
  },
  PAYOUT_SENT: {
    title: '💸 Выплата!',
    body: '{amount}₽ за заказ #{order_id} отправлены на карту.',
    url: '/worker',
  },

  // Аренда
  RENTAL_CONFIRMED: {
    title: '🔧 Бронь подтверждена',
    body: '{equipment_name} забронировано. Детали в приложении.',
    url: '/equipment',
  },
  RENTAL_REMINDER: {
    title: '⏰ Срок аренды заканчивается',
    body: 'Верните {equipment_name} сегодня до 20:00.',
    url: '/equipment',
  },
} as const;
