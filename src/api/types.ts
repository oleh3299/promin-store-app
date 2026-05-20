export type ApiHealth = {
  status: string
}

export type DeviceLoginResponse = {
  ok: boolean
  device_token: string
  device: {
    id: number
    store_id: number | null
    store_code: string | null
    store_name: string | null
    device_name: string
  }
}

export type DeviceRead = {
  id: number
  store_id: number | null
  login: string | null
  device_uuid: string
  device_name: string
  platform: string
  is_active: boolean
  status: string
  last_seen_at: string | null
  disabled_at: string | null
  disabled_reason: string | null
}

export type EmployeeRead = {
  id: number
  store_id: number | null
  full_name: string
  barcode: string
  tax_code: string | null
  position: string
  is_active: boolean
  external_1c_id: string | null
}

export type UserRead = {
  id: number
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'viewer' | 'hr_manager' | 'hr_tablet' | 'store_manager' | 'employee'
  is_active: boolean
}

export type AttendanceShiftRead = {
  id: number
  employee_id: number
  store_id: number
  device_id: number | null
  checkin_at: string
  checkout_at: string | null
  status: string
}

export type AttendanceActionResponse = {
  shift: AttendanceShiftRead
  event_id: number
}

export type StoreRequestRouteKey =
  | 'purchase'
  | 'accounting'
  | 'it'
  | 'manager'
  | 'security'
  | 'repair'
  | 'cash'
  | 'other'

export type ActiveStoreEmployee = {
  employee_id: number
  full_name: string
  position: string
  checkin_at: string
}

export type ActiveStoreEmployeesResponse = {
  items: ActiveStoreEmployee[]
}

export type StoreRequestResponse = {
  ok: boolean
  status: string | null
  route_key: string | null
  error: string | null
  message: string | null
}

export type PhotoReportRouteTestResponse = {
  ok: boolean
  sent: boolean
  room_name: string | null
  room_id: string
}

export type InvoiceRequestType = 'incoming' | 'return' | 'writeoff' | 'assembly'

export type InvoiceUploadResponse = {
  ok: boolean
  status: string | null
  request_type: string | null
  error: string | null
  message: string | null
}

export type InvoiceTodayItem = {
  id: number
  request_type: InvoiceRequestType
  request_type_label: string
  employee_name: string | null
  status: string
  created_at: string
  sent_at: string | null
}

export type InvoiceTodayResponse = {
  items: InvoiceTodayItem[]
}

export type PhotoReportTemplateItem = {
  id: number
  item_key: string
  item_name: string
  title: string
  description: string | null
  sort_order: number
  is_required: boolean
}

export type PhotoReportTemplateResponse = {
  items: PhotoReportTemplateItem[]
}

export type PhotoReportUploadResponse = {
  ok: boolean
  report_id: number | null
  items_done: number | null
  items_total: number | null
  status: string | null
  error: string | null
  message: string | null
}

export type PhotoReportItemUploadResponse = PhotoReportUploadResponse & {
  item_id: number | null
}

export type PlanogramItem = {
  id: number
  category_name: string
  description: string | null
  image_url: string
  uploaded_at: string
}

export type PlanogramListResponse = {
  items: PlanogramItem[]
}

export type StoreTaskStatus =
  | 'new'
  | 'open'
  | 'in_progress'
  | 'submitted'
  | 'completed'
  | 'verified'
  | 'rejected'
  | 'cancelled'

export type StoreTaskItem = {
  id: number
  title: string
  description: string | null
  source: string
  category: 'accounting' | 'photo_report' | 'general' | null
  source_route_key: string | null
  source_user_name: string | null
  status: StoreTaskStatus
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date: string | null
  due_time: string | null
  department_name: string | null
  requires_photo: boolean
  requires_comment: boolean
  requires_verification: boolean
  completed_at: string | null
  is_overdue: boolean
  created_at: string
}

export type StoreTaskAttachment = {
  id: number
  attachment_type: string
  file_url: string | null
  created_at: string
}

export type StoreTaskEvent = {
  id: number
  event_type: string
  author_type: string
  comment: string | null
  created_at: string
}

export type StoreTaskDetail = StoreTaskItem & {
  attachments: StoreTaskAttachment[]
  events: StoreTaskEvent[]
}

export type StoreTaskListResponse = {
  items: StoreTaskItem[]
}

export type StoreTaskActionResponse = {
  ok: boolean
  status: string | null
  task: StoreTaskItem | null
  error: string | null
  message: string | null
}

export type HRCandidateStatus =
  | 'candidate'
  | 'trainee'
  | 'approved'
  | 'synced_to_1c'
  | 'imported_from_1c'
  | 'rejected'

export type HRCandidateDecision = 'rejected' | 'trainee' | 'approved'

export type HRCandidateDocument = {
  document_type: string
  is_added: boolean
}

export type HRCandidatePayload = {
  first_name: string
  last_name: string
  middle_name?: string | null
  birth_date?: string | null
  phone1?: string | null
  phone2?: string | null
  passport_code?: string | null
  tax_code?: string | null
  residence_address?: string | null
  registration_address?: string | null
  marital_status?: string | null
  has_children: boolean
  has_credits: boolean
  credits_amount?: string | number | null
  previous_workplace?: string | null
  work_experience?: string | null
  interview_date?: string | null
  internship_datetime?: string | null
  position?: string | null
  hr_comment?: string | null
  decision: HRCandidateDecision
  passport_copy_added?: boolean
  registration_copy_added?: boolean
  tax_code_copy_added?: boolean
}

export type HRCandidate = HRCandidatePayload & {
  id: number
  sync_status: HRCandidateStatus
  synced_at: string | null
  imported_employee_id: number | null
  created_by: number | null
  created_at: string
  updated_at: string
  badge_code: string
  age: number | null
  documents: HRCandidateDocument[]
}

export type HRCandidateListResponse = {
  items: HRCandidate[]
}

export type HRCandidateSendResponse = {
  ok: boolean
  status: HRCandidateStatus
  error: string | null
  message: string | null
}
