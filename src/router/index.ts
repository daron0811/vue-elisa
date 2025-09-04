import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';


const routes: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: () => import('@/pages/ELISAWizard.vue') },
];


export const router = createRouter({
    history: createWebHistory(),
    routes,
});