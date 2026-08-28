export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      gifts: {
        Row: {
          id: string
          name: string
          description: string | null
          price_cents: number
          image_url: string | null
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price_cents: number
          image_url?: string | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_cents?: number
          image_url?: string | null
          is_available?: boolean
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          gift_id: string | null
          stripe_session_id: string
          stripe_payment_intent_id: string | null
          buyer_name: string | null
          buyer_email: string | null
          buyer_message: string | null
          amount_cents: number
          currency: string
          payment_method: string | null
          installments: number
          status: string
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          gift_id?: string | null
          stripe_session_id: string
          stripe_payment_intent_id?: string | null
          buyer_name?: string | null
          buyer_email?: string | null
          buyer_message?: string | null
          amount_cents: number
          currency?: string
          payment_method?: string | null
          installments?: number
          status?: string
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          status?: string
          stripe_payment_intent_id?: string | null
          payment_method?: string | null
          installments?: number
          paid_at?: string | null
        }
      }
      guests: {
        Row: {
          id: string
          name: string
          phone: string
          observations: string | null
          rsvp_status: string
          rsvp_confirmed_at: string | null
          short_url_code: string
          feed_access_granted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          observations?: string | null
          rsvp_status?: string
          rsvp_confirmed_at?: string | null
          short_url_code?: string
          feed_access_granted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          phone?: string
          observations?: string | null
          rsvp_status?: string
          rsvp_confirmed_at?: string | null
          short_url_code?: string
          feed_access_granted?: boolean
          updated_at?: string
        }
      }
      guest_companions: {
        Row: {
          id: string
          guest_id: string
          name: string
          phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          guest_id: string
          name: string
          phone?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          phone?: string | null
        }
      }
      whatsapp_messages: {
        Row: {
          id: string
          guest_id: string | null
          template_name: string
          status: string
          sent_at: string
        }
        Insert: {
          id?: string
          guest_id?: string | null
          template_name: string
          status?: string
          sent_at?: string
        }
        Update: {
          status?: string
        }
      }
    }
  }
}

export type Gift = Database['public']['Tables']['gifts']['Row']
export type GiftInsert = Database['public']['Tables']['gifts']['Insert']
export type GiftUpdate = Database['public']['Tables']['gifts']['Update']
export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type Guest = Database['public']['Tables']['guests']['Row']
export type GuestInsert = Database['public']['Tables']['guests']['Insert']
export type GuestUpdate = Database['public']['Tables']['guests']['Update']
export type GuestCompanion = Database['public']['Tables']['guest_companions']['Row']
export type GuestCompanionInsert = Database['public']['Tables']['guest_companions']['Insert']
export type WhatsappMessage = Database['public']['Tables']['whatsapp_messages']['Row']
