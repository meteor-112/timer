import { createRouter, createWebHistory } from 'vue-router';

import TomatoClockPage from '@/pages/TomatoClockPage.vue';
import PrivacyPage from '@/pages/PrivacyPage.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: TomatoClockPage,
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: PrivacyPage,
    },
  ],
});

export default router;
