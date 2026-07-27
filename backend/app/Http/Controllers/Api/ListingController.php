<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Listing;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ListingController extends Controller
{
 public function index(Request $request) {
  return Listing::query()->with(['category:id,name,slug','images:id,listing_id,path,sort_order'])
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
  return $listing->load(['category','images','user:id,name']);
 }
 public function store(Request $request) {
  $data=$this->validated($request); $data['user_id']=$request->user()->id;
  $data['published_at']=$data['status']==='published'?now():null;
  return response()->json(Listing::create($data),201);
 }
 public function update(Request $request, Listing $listing) {
  abort_unless($request->user()->id===$listing->user_id,403); $data=$this->validated($request);
  if (($data['status'] ?? null)==='published' && !$listing->published_at) $data['published_at']=now();
  $listing->update($data); return $listing->fresh(['category','images']);
 }
 public function destroy(Request $request, Listing $listing) {
  abort_unless($request->user()->id===$listing->user_id,403); $listing->delete(); return response()->noContent();
 }
 private function validated(Request $request): array {
  return $request->validate([
   'category_id'=>['required','exists:categories,id'],'title'=>['required','string','max:120'],
   'description'=>['required','string','max:5000'],'price'=>['nullable','numeric','min:0'],
   'city'=>['required','string','max:80'],'latitude'=>['nullable','numeric','between:-90,90'],
   'longitude'=>['nullable','numeric','between:-180,180'],'status'=>['required',Rule::in(['draft','published','sold','archived'])],
  ]);
 }
}
