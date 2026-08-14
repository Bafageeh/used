<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Listing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ListingController extends Controller
{
 public function index(Request $request) {
  return Listing::query()->with(['category:id,name,slug','images:id,listing_id,path,sort_order','user:id,name'])
   ->where('status','published')
   ->when($request->filled('q'), function ($query) use ($request) {
    $term='%'.$request->string('q')->trim().'%';
    $query->where(function ($inner) use ($term) { $inner->where('title','like',$term)->orWhere('description','like',$term); });
   })
   ->when($request->filled('category_id'), fn ($q) => $q->where('category_id',$request->integer('category_id')))
   ->when($request->filled('city'), fn ($q) => $q->where('city',$request->string('city')))
   ->latest('published_at')->paginate(20);
 }
 public function show(Listing $listing) {
  abort_unless($listing->status==='published' || auth('sanctum')->id()===$listing->user_id,404);
  if ($listing->status === 'published' && auth('sanctum')->id() !== $listing->user_id) $listing->increment('views_count');
  $listing->load(['category','images','user:id,name,phone']);
  if (!$listing->show_phone) $listing->user->makeHidden('phone');
  return $listing;
 }
 public function mine(Request $request) {
  return $request->user()->listings()->with(['category:id,name,slug','images'])->latest()->paginate(20);
 }
 public function store(Request $request) {
  $data=$this->validated($request); $data['price']=null; $data['user_id']=$request->user()->id;
  $data['published_at']=$data['status']==='published'?now():null;
  return response()->json(Listing::create($data),201);
 }
 public function update(Request $request, Listing $listing) {
  abort_unless($request->user()->id===$listing->user_id,403); $data=$this->validated($request); $data['price']=null;
  if (($data['status'] ?? null)==='published' && !$listing->published_at) $data['published_at']=now();
  $listing->update($data); return $listing->fresh(['category','images']);
 }
 public function refresh(Request $request, Listing $listing) {
  abort_unless($request->user()->id===$listing->user_id,403);
  $listing->forceFill(['status'=>'published','published_at'=>now()])->save();
  return $listing->fresh(['category','images']);
 }
 public function destroy(Request $request, Listing $listing) {
  abort_unless($request->user()->id===$listing->user_id,403);
  $paths=$listing->images()->pluck('path')->filter()->all();
  if ($paths) Storage::disk('public')->delete($paths);
  if ($listing->video_path) Storage::disk('public')->delete($listing->video_path);
  Storage::disk('public')->deleteDirectory("listings/{$listing->id}");
  $listing->delete();
  return response()->noContent();
 }
 private function validated(Request $request): array {
  return $request->validate([
   'category_id'=>['required','exists:categories,id'],'title'=>['required','string','max:120'],
   'description'=>['required','string','max:5000'],
   'city'=>['required','string','max:80'],'latitude'=>['nullable','numeric','between:-90,90'],
   'longitude'=>['nullable','numeric','between:-180,180'],'status'=>['required',Rule::in(['draft','published','sold','archived'])],
   'show_phone'=>['sometimes','boolean'],
  ]);
 }
}
