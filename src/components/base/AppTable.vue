<script setup>
import { ChevronUp, ChevronDown } from 'lucide-vue-next'
import AppSkeleton from './AppSkeleton.vue'
import AppEmptyState from './AppEmptyState.vue'

const props = defineProps({
  columns: {
    type: Array,
    default: () => [],
    // [{ key, label, sortable?, width?, align? }]
  },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  emptyTitle: { type: String, default: 'No records found' },
  emptyDescription: { type: String, default: '' },
  skeletonRows: { type: Number, default: 5 },
  rowKey: { type: String, default: 'id' },
  rowClass: { type: Function, default: null },
  sortKey: { type: String, default: '' },
  sortDir: { type: String, default: 'asc' }, // asc | desc
})

const emit = defineEmits(['sort', 'row-click'])

function handleSort(col) {
  if (!col.sortable) return
  const dir = props.sortKey === col.key && props.sortDir === 'asc' ? 'desc' : 'asc'
  emit('sort', { key: col.key, dir })
}

function alignClass(align) {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl">
    <table class="w-full text-sm">
      <!-- Head -->
      <thead>
        <tr class="border-b border-gray-200">
          <th
            v-for="col in columns"
            :key="col.key"
            :style="col.width ? { width: col.width } : {}"
            :class="[
              'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide',
              alignClass(col.align),
              col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : '',
            ]"
            @click="handleSort(col)"
          >
            <span class="inline-flex items-center gap-1">
              {{ col.label }}
              <span v-if="col.sortable" class="flex flex-col -space-y-1">
                <ChevronUp
                  :class="['w-3 h-3', sortKey === col.key && sortDir === 'asc' ? 'text-primary' : 'text-gray-300']"
                />
                <ChevronDown
                  :class="['w-3 h-3', sortKey === col.key && sortDir === 'desc' ? 'text-primary' : 'text-gray-300']"
                />
              </span>
            </span>
          </th>
        </tr>
      </thead>

      <!-- Body -->
      <tbody>
        <!-- Skeleton loading rows -->
        <template v-if="loading">
          <tr v-for="n in skeletonRows" :key="`sk-${n}`" class="border-b border-gray-100">
            <td v-for="col in columns" :key="col.key" class="px-4 py-3.5">
              <AppSkeleton height="14px" :width="col.align === 'right' ? '60%' : '80%'" class="ml-auto" />
            </td>
          </tr>
        </template>

        <!-- Empty state -->
        <template v-else-if="rows.length === 0">
          <tr>
            <td :colspan="columns.length">
              <AppEmptyState :title="emptyTitle" :description="emptyDescription" />
            </td>
          </tr>
        </template>

        <!-- Data rows -->
        <template v-else>
          <tr
            v-for="row in rows"
            :key="row[rowKey]"
            :class="['border-b border-gray-100 hover:bg-gray-50 transition-colors', rowClass ? rowClass(row) : '']"
            @click="emit('row-click', row)"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="['px-4 py-3.5 text-gray-900', alignClass(col.align)]"
            >
              <!-- Named slot per column key: #cell-status, #cell-name, etc. -->
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] ?? '—' }}
              </slot>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
