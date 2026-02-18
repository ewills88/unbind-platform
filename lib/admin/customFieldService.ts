// Session 21: Custom Field Service (functional)
import type { CustomFieldDefinition, CustomFieldType } from '@/types/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

// ============================================================
// Get Field Definitions
// ============================================================

export async function getFieldDefinitions(
  supabase: SupabaseClient,
  firmId: string,
  entityType?: string
): Promise<CustomFieldDefinition[]> {
  let query = (supabase as SupabaseClient)
    .from('custom_field_definitions')
    .select('*')
    .eq('firm_id', firmId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ============================================================
// Create Field Definition
// ============================================================

export async function createFieldDefinition(
  supabase: SupabaseClient,
  firmId: string,
  params: {
    entity_type: string
    field_name: string
    field_type: CustomFieldType
    description?: string
    placeholder?: string
    default_value?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options?: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validation_rules?: any[]
    is_required?: boolean
    is_searchable?: boolean
    is_visible_in_list?: boolean
    is_visible_in_portal?: boolean
    section?: string
    created_by: string
  }
): Promise<CustomFieldDefinition> {
  const fieldKey = params.field_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

  // Get next display order
  const { count } = await (supabase as SupabaseClient)
    .from('custom_field_definitions')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', firmId)
    .eq('entity_type', params.entity_type)

  const { data, error } = await (supabase as SupabaseClient)
    .from('custom_field_definitions')
    .insert({
      firm_id: firmId,
      entity_type: params.entity_type,
      field_name: params.field_name,
      field_key: fieldKey,
      field_type: params.field_type,
      description: params.description,
      placeholder: params.placeholder,
      default_value: params.default_value,
      options: params.options,
      validation_rules: params.validation_rules,
      is_required: params.is_required || false,
      is_searchable: params.is_searchable !== false,
      is_visible_in_list: params.is_visible_in_list || false,
      is_visible_in_portal: params.is_visible_in_portal || false,
      section: params.section,
      display_order: (count || 0) + 1,
      created_by: params.created_by,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// Update Field Definition
// ============================================================

export async function updateFieldDefinition(
  supabase: SupabaseClient,
  firmId: string,
  fieldId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates: Record<string, any>
): Promise<CustomFieldDefinition> {
  // Don't allow changing field_key or entity_type
  delete updates.field_key
  delete updates.entity_type
  delete updates.firm_id
  delete updates.id
  delete updates.created_at
  delete updates.created_by

  const { data, error } = await (supabase as SupabaseClient)
    .from('custom_field_definitions')
    .update(updates)
    .eq('id', fieldId)
    .eq('firm_id', firmId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// Delete Field Definition (soft delete)
// ============================================================

export async function deleteFieldDefinition(
  supabase: SupabaseClient,
  firmId: string,
  fieldId: string
): Promise<void> {
  const { error } = await (supabase as SupabaseClient)
    .from('custom_field_definitions')
    .update({ is_active: false })
    .eq('id', fieldId)
    .eq('firm_id', firmId)

  if (error) throw error
}

// ============================================================
// Get Field Values for Entity
// ============================================================

export async function getFieldValues(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  const { data: values } = await (supabase as SupabaseClient)
    .from('custom_field_values')
    .select('value, value_json, field_definition_id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)

  if (!values || values.length === 0) return {}

  // Fetch definitions to get field keys
  const defIds = Array.from(new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values.map((v: any) => v.field_definition_id)
  ))

  const { data: definitions } = await (supabase as SupabaseClient)
    .from('custom_field_definitions')
    .select('id, field_key, field_type')
    .in('id', defIds)

  if (!definitions) return {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defMap = new Map<string, any>(definitions.map((d: any) => [d.id, d]))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values.forEach((v: any) => {
    const def = defMap.get(v.field_definition_id)
    if (def) {
      result[def.field_key] = v.value_json || v.value
    }
  })

  return result
}

// ============================================================
// Set Field Values for Entity
// ============================================================

export async function setFieldValues(
  supabase: SupabaseClient,
  firmId: string,
  entityType: string,
  entityId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: Record<string, any>
): Promise<void> {
  const definitions = await getFieldDefinitions(supabase, firmId, entityType)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defMap = new Map(definitions.map((d: any) => [d.field_key, d]))

  const upserts = Object.entries(values)
    .filter(([key]) => defMap.has(key))
    .map(([key, value]) => {
      const def = defMap.get(key)!
      const isJson = ['select', 'multiselect'].includes(def.field_type) || typeof value === 'object'

      return {
        field_definition_id: def.id,
        entity_type: entityType,
        entity_id: entityId,
        value: isJson ? null : String(value),
        value_json: isJson ? value : null,
      }
    })

  if (upserts.length > 0) {
    await (supabase as SupabaseClient)
      .from('custom_field_values')
      .upsert(upserts, { onConflict: 'field_definition_id,entity_type,entity_id' })
  }
}

// ============================================================
// Validate Field Values
// ============================================================

export function validateFieldValues(
  definitions: CustomFieldDefinition[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: Record<string, any>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  for (const def of definitions) {
    const value = values[def.field_key]

    if (def.is_required && (value === undefined || value === null || value === '')) {
      errors[def.field_key] = `${def.field_name} is required`
      continue
    }

    if (value === undefined || value === null || value === '') continue

    switch (def.field_type) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors[def.field_key] = 'Invalid email format'
        }
        break
      case 'phone':
        if (!/^[\d\s\-+()]+$/.test(value)) {
          errors[def.field_key] = 'Invalid phone format'
        }
        break
      case 'number':
      case 'currency':
        if (isNaN(Number(value))) {
          errors[def.field_key] = 'Must be a number'
        }
        break
      case 'date':
      case 'datetime':
        if (isNaN(Date.parse(value))) {
          errors[def.field_key] = 'Invalid date format'
        }
        break
      case 'url':
        try {
          new URL(value)
        } catch {
          errors[def.field_key] = 'Invalid URL format'
        }
        break
      case 'select':
        if (def.options && !def.options.some(o => o.value === value)) {
          errors[def.field_key] = 'Invalid selection'
        }
        break
    }

    if (def.validation_rules) {
      for (const rule of def.validation_rules) {
        if (rule.type === 'minLength' && String(value).length < Number(rule.value)) {
          errors[def.field_key] = rule.message || `Minimum ${rule.value} characters`
        }
        if (rule.type === 'maxLength' && String(value).length > Number(rule.value)) {
          errors[def.field_key] = rule.message || `Maximum ${rule.value} characters`
        }
        if (rule.type === 'pattern' && !new RegExp(String(rule.value)).test(String(value))) {
          errors[def.field_key] = rule.message || 'Invalid format'
        }
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
