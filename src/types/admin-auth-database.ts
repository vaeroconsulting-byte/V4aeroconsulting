export type AdminAuthDatabase = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string;
          role: string;
          active: boolean;
        };
        Insert: {
          user_id: string;
          role: string;
          active?: boolean;
        };
        Update: {
          user_id?: string;
          role?: string;
          active?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
