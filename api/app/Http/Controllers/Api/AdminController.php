<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['admin', 'moderator'], true), 403);
    }

    public function dashboard(Request $request)
    {
        $this->authorizeAdmin($request);
        return [
            'users' => User::count(),
            'active_users' => User::where('is_active', true)->count(),
            'published_listings' => Listing::where('status', 'published')->count(),
            'draft_listings' => Listing::where('status', 'draft')->count(),
            'sold_listings' => Listing::where('status', 'sold')->count(),
        ];
    }

    public function users(Request $request)
    {
        $this->authorizeAdmin($request);
        return User::query()->when($request->filled('q'), function ($query) use ($request) {
            $term = '%'.$request->string('q')->trim().'%';
            $query->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('phone', 'like', $term));
        })->latest()->paginate(30);
    }

    public function updateUser(Request $request, User $user)
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'role' => ['sometimes', Rule::in(['user', 'moderator', 'admin'])],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        abort_if($request->user()->is($user) && array_key_exists('is_active', $data) && !$data['is_active'], 422, 'لا يمكنك إيقاف حسابك.');
        $user->update($data);
        return $user;
    }

    public function listings(Request $request)
    {
        $this->authorizeAdmin($request);
        return Listing::with(['user:id,name,phone', 'category:id,name', 'images'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->latest()->paginate(30);
    }

    public function updateListing(Request $request, Listing $listing)
    {
        $this->authorizeAdmin($request);
        $data = $request->validate(['status' => ['required', Rule::in(['draft', 'published', 'sold', 'archived'])]]);
        $listing->update($data + ['published_at' => $data['status'] === 'published' ? ($listing->published_at ?? now()) : $listing->published_at]);
        return $listing->fresh(['user:id,name,phone', 'category:id,name', 'images']);
    }

    public function storeCategory(Request $request)
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'slug' => ['required', 'alpha_dash', 'max:100', 'unique:categories'],
            'icon' => ['nullable', 'string', 'max:50'],
            'parent_id' => ['nullable', 'exists:categories,id'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        return response()->json(Category::create($data), 201);
    }
}
