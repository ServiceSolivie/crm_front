import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export function useEnumOptions(enumMap, i18nPrefix) {
  const { t } = useI18n()
  return computed(() =>
    Object.entries(enumMap).map(([value, meta]) => ({
      value,
      label: t(`${i18nPrefix}.${value}`, value),
      ...(meta?.color ? { color: meta.color } : {}),
    })),
  )
}
