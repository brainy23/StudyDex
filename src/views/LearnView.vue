<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()
onMounted(() => router.replace({ name: 'study-decks', query: { ...route.query, mode: 'learn' } }))
</script>
<template><p role="status">Opening your lesson…</p></template>
