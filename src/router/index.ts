import { createRouter, createWebHistory } from 'vue-router'

import TomatoClockPage from '@/pages/TomatoClockPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: TomatoClockPage,
    },
  ],
})

export default router
