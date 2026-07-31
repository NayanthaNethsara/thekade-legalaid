export interface Address {
  label: string;
  value: string;
  is_default: boolean;
}

export interface Profile {
  name: string | null;
  phone: string | null;
  addresses: Address[];
  memory: string | null;
}

export interface ProfileInput {
  name: string | null;
  phone: string | null;
  addresses: Address[];
}
