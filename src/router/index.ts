import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: 'Let\'s Pool - ThreeJS and Cannon physics billard'
    }
  },
  {
    path: '/scene-0',
    name: 'Scene-0',
    component: () => import('../views/Scene-0.vue'),
    meta: {
      title: 'Let\'s Pool - First Approach of CannonJS'
    }
  },
  {
    path: '/scene-1',
    name: 'Scene-1',
    component: () => import('../views/Scene-1.vue'),
    meta: {
      title: 'Let\'s Pool - Gameplay mechanics'
    }
  },
  {
    path: '/scene-2',
    name: 'Scene-2',
    component: () => import('../views/Scene-2.vue')
    ,
    meta: {
      title: 'Let\'s Pool - Creating the board'
    }
  },
  {
    path: '/scene-3',
    name: 'Scene-3',
    component: () => import('../views/Scene-3.vue'),
    meta: {
      title: 'Let\'s Pool - Play now !'
    }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = String(to.meta.title)
  next()
})

export default router
