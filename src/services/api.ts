const API_BASE_URL = 'https://epic-backend-nzvz68ue5-beingmartinbmcs-projects.vercel.app/api';

export interface BackendEvent {
  _id: string;
  title: string;
  description?: string;
  eventDate: string;
  category: string;
  metadata?: {
    labels?: string[];
    reaction?: string;
    comments?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

export const eventsApi = {
  async getAll(params?: {
    limit?: number;
    skip?: number;
    category?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<BackendEvent[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `${API_BASE_URL}/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }
    
    const result: PaginatedResponse<BackendEvent> = await response.json();
    return result.data;
  },

  async getById(id: string): Promise<BackendEvent> {
    const response = await fetch(`${API_BASE_URL}/events/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch event: ${response.statusText}`);
    }
    
    const result: ApiResponse<BackendEvent> = await response.json();
    return result.data;
  },

  async create(event: {
    title: string;
    description?: string;
    eventDate: string;
    category?: string;
    metadata?: {
      labels?: string[];
      reaction?: string;
      comments?: string;
    };
  }): Promise<BackendEvent> {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...event,
        category: event.category || 'general',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.statusText}`);
    }
    
    const result: ApiResponse<BackendEvent> = await response.json();
    return result.data;
  },

  async update(id: string, updates: {
    title?: string;
    description?: string;
    eventDate?: string;
    category?: string;
    metadata?: {
      labels?: string[];
      reaction?: string;
      comments?: string;
    };
  }): Promise<BackendEvent> {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update event: ${response.statusText}`);
    }
    
    const result: ApiResponse<BackendEvent> = await response.json();
    return result.data;
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete event: ${response.statusText}`);
    }
  },

  async getUpcoming(): Promise<BackendEvent[]> {
    const response = await fetch(`${API_BASE_URL}/events/upcoming`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch upcoming events: ${response.statusText}`);
    }
    
    const result: ApiResponse<BackendEvent[]> = await response.json();
    return result.data;
  },

  async getRange(startDate: string, endDate: string, params?: {
    limit?: number;
    skip?: number;
  }): Promise<BackendEvent[]> {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
    });
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());

    const url = `${API_BASE_URL}/events/range?${queryParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch events in range: ${response.statusText}`);
    }
    
    const result: ApiResponse<BackendEvent[]> & { count: number } = await response.json();
    return result.data;
  },
};

export function mapBackendEventToFrontend(backendEvent: BackendEvent): {
  id: string;
  title: string;
  date: string;
  labels: string[];
  comments: string;
  reaction?: string;
} {
  return {
    id: backendEvent._id,
    title: backendEvent.title,
    date: backendEvent.eventDate,
    labels: backendEvent.metadata?.labels || [],
    comments: backendEvent.metadata?.comments || backendEvent.description || '',
    reaction: backendEvent.metadata?.reaction,
  };
}

export function mapFrontendEventToBackend(frontendEvent: {
  title: string;
  date: string;
  labels: string[];
  comments: string;
  reaction?: string;
}): {
  title: string;
  eventDate: string;
  description: string;
  category: string;
  metadata: {
    labels: string[];
    reaction?: string;
    comments: string;
  };
} {
  return {
    title: frontendEvent.title,
    eventDate: frontendEvent.date,
    description: frontendEvent.comments,
    category: 'general',
    metadata: {
      labels: frontendEvent.labels,
      reaction: frontendEvent.reaction,
      comments: frontendEvent.comments,
    },
  };
}
