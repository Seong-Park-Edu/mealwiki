using Microsoft.AspNetCore.Mvc;
using Server.Models;
using System.Threading.Tasks;
using Supabase;
using System.Linq;
using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Server.Controllers
{
    // ==========================================
    // DTO 정의 (Null 경고 해결을 위해 ? 추가 및 초기화)
    // ==========================================
    public class WikiRequestDto
    {
        public string RestaurantId { get; set; } = null!;
        public string RestaurantName { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string Content { get; set; } = null!;
        public string Nickname { get; set; } = null!;
        public string X { get; set; } = null!;
        public string Y { get; set; } = null!;
    }
    public class BookmarkRequestDto
    {
        public string Nickname { get; set; } = null!;
        public string RestaurantId { get; set; } = null!;
        public string RestaurantName { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string X { get; set; } = null!;
        public string Y { get; set; } = null!;
    }
    public class AckRequestDto
    {
        public string RestaurantId { get; set; } = null!;
        public string Nickname { get; set; } = null!;
    }
    public class LikeRequestDto
    {
        public string RestaurantId { get; set; } = null!;
        public string Nickname { get; set; } = null!;
        public Guid TargetUserId { get; set; }
    }
    public class TagVoteRequestDto
    {
        public string RestaurantId { get; set; } = null!;
        public string Nickname { get; set; } = null!;
        public string Tag { get; set; } = null!;
    }
    public class RollbackRequestDto { public Guid HistoryId { get; set; } }
    public class TagFilterRequestDto
    {
        public List<string> RestaurantIds { get; set; } = new();
        public string TargetTag { get; set; } = null!;
    }

    public class CommentRequestDto { public string RestaurantId { get; set; } = null!; public string Nickname { get; set; } = null!; public string Content { get; set; } = null!; }





    [Route("api/[controller]")]
    [ApiController]
    public class WikiController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        public WikiController(Supabase.Client supabase) { _supabase = supabase; }

        // ------------------------------------------------
        // (1) 조회
        // ------------------------------------------------
        [HttpGet("{restaurantId}")]
        public async Task<IActionResult> GetWiki(string restaurantId, [FromQuery] string? nickname = null)
        {
            var resResponse = await _supabase.From<Restaurant>().Where(r => r.Id == restaurantId).Get();
            var restaurant = resResponse.Models.FirstOrDefault();

            var postResponse = await _supabase.From<WikiPost>().Where(x => x.RestaurantId == restaurantId).Get();
            var post = postResponse.Models.FirstOrDefault();

            // 추천 여부 확인
            bool isLiked = false;
            if (post != null && post.AuthorId != null && !string.IsNullOrEmpty(nickname))
            {
                var u = (await _supabase.From<User>().Where(x => x.Nickname == nickname).Get()).Models.FirstOrDefault();
                if (u != null)
                {
                    // Where 체이닝으로 안전하게 조회
                    var likeCheck = await _supabase.From<WikiLike>()
                        .Where(l => l.UserId == u.Id)
                        .Where(l => l.RestaurantId == restaurantId)
                        .Where(l => l.TargetUserId == post.AuthorId.Value)
                        .Get();
                    isLiked = likeCheck.Models.Any();
                }
            }

            // 태그 통계 (식당 기준)
            var tagStats = new List<object>();

            // ★ 수정됨: post_id 대신 restaurant_id 사용
            var tagsRes = await _supabase.From<WikiTagVote>()
                .Filter("restaurant_id", Supabase.Postgrest.Constants.Operator.Equals, restaurantId)
                .Get();

            var allVotes = tagsRes.Models;
            var groups = allVotes.GroupBy(v => v.Tag).Select(g => new { tag = g.Key, count = g.Count(), isActive = false }).ToList();

            if (!string.IsNullOrEmpty(nickname))
            {
                var u = (await _supabase.From<User>().Where(x => x.Nickname == nickname).Get()).Models.FirstOrDefault();
                if (u != null)
                {
                    var myTags = allVotes.Where(v => v.UserId == u.Id).Select(v => v.Tag).ToHashSet();
                    groups = groups.Select(t => new { t.tag, t.count, isActive = myTags.Contains(t.tag) }).ToList();
                }
            }


            // ★ [추가됨] 댓글 목록 가져오기
            var commentRes = await _supabase.From<WikiComment>()
                .Where(c => c.RestaurantId == restaurantId)
                .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending) // 최신순
                .Get();


            var comments = commentRes.Models.Select(c => new
            {
                id = c.Id,
                nickname = c.Nickname,
                content = c.Content,
                createdAt = c.CreatedAt
            }).ToList();


            // ★ [추가됨] 이미지 목록 가져오기
            var imgRes = await _supabase.From<WikiImage>()
                .Where(i => i.RestaurantId == restaurantId)
                .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                .Get();

            var images = imgRes.Models.Select(i => i.ImageUrl).ToList();

            tagStats.AddRange(groups);

            // 작성자 정보
            string creatorName = "정보 없음"; int creatorLikes = 0; Guid? creatorId = post?.CreatorId;
            string lastEditorName = "정보 없음"; int authorLikes = 0; Guid? lastEditorId = post?.AuthorId;

            if (post?.AuthorId != null)
            {
                var author = (await _supabase.From<User>().Where(u => u.Id == post.AuthorId.Value).Get()).Models.FirstOrDefault();
                if (author != null) { lastEditorName = author.Nickname; authorLikes = author.TotalLikes; }
            }
            if (post?.CreatorId != null)
            {
                var creator = (await _supabase.From<User>().Where(u => u.Id == post.CreatorId.Value).Get()).Models.FirstOrDefault();
                if (creator != null) { creatorName = creator.Nickname; creatorLikes = creator.TotalLikes; }
            }
            else { creatorName = lastEditorName; creatorLikes = authorLikes; }

            return Ok(new
            {
                RestaurantName = restaurant?.Name,
                Address = restaurant?.Address,
                RestaurantAck = restaurant?.AckCount ?? 0,
                X = restaurant?.X,
                Y = restaurant?.Y,
                Id = post?.Id,
                Content = post?.Content ?? "",
                Version = post?.Version ?? 0,
                UpdatedAt = post?.UpdatedAt,
                LikeCount = post?.LikeCount ?? 0,
                TagStats = tagStats,
                IsLiked = isLiked,
                Comments = comments,
                Images = images,
                CreatorName = creatorName,
                CreatorId = creatorId,
                CreatorLikes = creatorLikes,
                LastEditorName = lastEditorName,
                LastEditorId = lastEditorId,
                AuthorLikes = authorLikes
            });
        }

        // ★ [추가됨] 댓글 작성
        [HttpPost("comment")]
        public async Task<IActionResult> AddComment([FromBody] CommentRequestDto request)
        {
            if (string.IsNullOrEmpty(request.Nickname)) return BadRequest("로그인 필요");
            if (string.IsNullOrWhiteSpace(request.Content)) return BadRequest("내용을 입력해주세요.");

            var uRes = await _supabase.From<User>().Where(u => u.Nickname == request.Nickname).Get();
            var user = uRes.Models.FirstOrDefault();
            if (user == null) { user = new User { Id = Guid.NewGuid(), Nickname = request.Nickname }; await _supabase.From<User>().Insert(user); }

            // 식당 없으면 생성
            var rRes = await _supabase.From<Restaurant>().Where(r => r.Id == request.RestaurantId).Get();
            if (!rRes.Models.Any()) await _supabase.From<Restaurant>().Insert(new Restaurant { Id = request.RestaurantId, Name = "정보 없음", AckCount = 0 });

            var newComment = new WikiComment
            {
                RestaurantId = request.RestaurantId,
                UserId = user.Id,
                Nickname = request.Nickname,
                Content = request.Content,
                CreatedAt = DateTime.UtcNow
            };

            await _supabase.From<WikiComment>().Insert(newComment);
            return Ok(new { message = "댓글 등록 완료" });
        }

        // ------------------------------------------------
        // (2) 태그 투표 (식당 기준)
        // ------------------------------------------------
        [HttpPost("tag")]
        public async Task<IActionResult> ToggleTag([FromBody] TagVoteRequestDto request)
        {
            if (string.IsNullOrEmpty(request.Nickname)) return BadRequest("로그인 필요");

            var uRes = await _supabase.From<User>().Where(u => u.Nickname == request.Nickname).Get();
            var user = uRes.Models.FirstOrDefault();
            if (user == null) { user = new User { Id = Guid.NewGuid(), Nickname = request.Nickname }; await _supabase.From<User>().Insert(user); }

            // 식당 없으면 생성
            var rRes = await _supabase.From<Restaurant>().Where(r => r.Id == request.RestaurantId).Get();
            if (!rRes.Models.Any())
            {
                await _supabase.From<Restaurant>().Insert(new Restaurant { Id = request.RestaurantId, Name = "정보 없음", AckCount = 0 });
            }

            // 투표 조회 (식당 기준)
            var voteRes = await _supabase.From<WikiTagVote>()
                .Where(v => v.RestaurantId == request.RestaurantId) // ★ PostId 아님
                .Where(v => v.UserId == user.Id)
                .Where(v => v.Tag == request.Tag)
                .Get();

            var existingVote = voteRes.Models.FirstOrDefault();

            if (existingVote != null)
            {
                await _supabase.From<WikiTagVote>().Where(v => v.Id == existingVote.Id).Delete();
                return Ok(new { message = "태그 취소", action = "removed" });
            }
            else
            {
                var newVote = new WikiTagVote
                {
                    RestaurantId = request.RestaurantId,
                    UserId = user.Id,
                    Tag = request.Tag,
                    CreatedAt = DateTime.UtcNow
                };
                await _supabase.From<WikiTagVote>().Insert(newVote);
                return Ok(new { message = "태그 투표", action = "added" });
            }
        }

        // ------------------------------------------------
        // (3) 태그 필터링 (업그레이드: 식당 정보까지 반환)
        // ------------------------------------------------
        [HttpPost("filter-by-tag")]
        public async Task<IActionResult> FilterByTag([FromBody] TagFilterRequestDto request)
        {
            // 1. 해당 태그를 가진 투표 내역 조회
            var votes = await _supabase.From<WikiTagVote>()
               .Filter("tag", Supabase.Postgrest.Constants.Operator.Equals, request.TargetTag)
               .Get();

            if (!votes.Models.Any()) return Ok(new List<object>());

            // 2. 중복 제거한 식당 ID 목록 추출
            var validIds = votes.Models.Select(v => v.RestaurantId).Distinct().ToList();

            // 3. 식당 상세 정보 조회 (이름, 주소, 좌표 등)
            var restaurants = await _supabase.From<Restaurant>()
                .Filter("id", Supabase.Postgrest.Constants.Operator.In, validIds)
                .Get();

            // 4. 프론트엔드가 쓰기 편하게 데이터 정리
            // (카카오 API랑 최대한 비슷한 구조로 주면 프론트가 편함)
            var result = restaurants.Models.Select(r => new
            {
                id = r.Id,
                place_name = r.Name,         // 카카오의 place_name 대응
                road_address_name = r.Address, // 카카오의 road_address_name 대응
                category_name = "우리들의 태그 맛집",
                x = r.X,
                y = r.Y
            });

            return Ok(result);
        }

        // ------------------------------------------------
        // (4) 저장 (SaveWiki)
        // ------------------------------------------------
        [HttpPost]
        public async Task<IActionResult> SaveWiki([FromBody] WikiRequestDto request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Nickname)) return BadRequest("닉네임 누락");
                if (string.IsNullOrWhiteSpace(request.RestaurantId)) return BadRequest("식당 ID 누락");

                var rRes = await _supabase.From<Restaurant>().Where(r => r.Id == request.RestaurantId).Get();
                var existingRes = rRes.Models.FirstOrDefault();

                if (existingRes == null)
                {
                    await _supabase.From<Restaurant>().Insert(new Restaurant
                    {
                        Id = request.RestaurantId,
                        Name = request.RestaurantName ?? "이름 없음",
                        Address = request.Address ?? "주소 없음",
                        X = request.X,
                        Y = request.Y,
                        AckCount = 0
                    });
                }
                else
                {
                    await _supabase.From<Restaurant>().Where(r => r.Id == request.RestaurantId)
                        .Set(r => r.Name, request.RestaurantName ?? existingRes.Name)
                        .Set(r => r.Address, request.Address ?? existingRes.Address)
                        .Set(r => r.X, request.X).Set(r => r.Y, request.Y).Update();
                }

                var userRes = await _supabase.From<User>().Where(u => u.Nickname == request.Nickname).Get();
                var user = userRes.Models.FirstOrDefault();
                if (user == null) { user = new User { Id = Guid.NewGuid(), Nickname = request.Nickname, Password = "temp", CreatedAt = DateTime.UtcNow }; await _supabase.From<User>().Insert(user); }
                else { await _supabase.From<User>().Where(u => u.Id == user.Id).Set(u => u.ReviewCount, user.ReviewCount + 1).Update(); }

                var existingResponse = await _supabase.From<WikiPost>().Where(x => x.RestaurantId == request.RestaurantId).Get();
                var existingPost = existingResponse.Model;

                if (existingPost == null)
                {
                    var newPost = new WikiPost { RestaurantId = request.RestaurantId, Content = request.Content, Version = 1, UpdatedAt = DateTime.UtcNow, LikeCount = 0, AuthorId = user.Id, CreatorId = user.Id };
                    await _supabase.From<WikiPost>().Insert(newPost);
                }
                else
                {
                    try { await _supabase.From<WikiHistory>().Insert(new WikiHistory { PostId = existingPost.Id, Content = existingPost.Content, Version = existingPost.Version, EditorId = existingPost.AuthorId, ArchivedAt = DateTime.UtcNow }); } catch { }
                    await _supabase.From<WikiPost>().Where(x => x.Id == existingPost.Id).Set(x => x.Content, request.Content).Set(x => x.Version, existingPost.Version + 1).Set(x => x.UpdatedAt, DateTime.UtcNow).Set(x => x.AuthorId, user.Id).Update();
                }
                return Ok(new { message = "저장 성공!" });
            }
            catch (Exception ex) { return StatusCode(500, $"서버 에러: {ex.Message}"); }
        }

        // ------------------------------------------------
        // (5) 추천하기 (Like)
        // ------------------------------------------------
        [HttpPost("like")]
        public async Task<IActionResult> LikeWiki([FromBody] LikeRequestDto request)
        {
            if (string.IsNullOrEmpty(request.Nickname)) return BadRequest("로그인 필요");
            if (request.TargetUserId == Guid.Empty) return BadRequest("추천할 대상이 없습니다.");

            var uRes = await _supabase.From<User>().Where(u => u.Nickname == request.Nickname).Get();
            var user = uRes.Models.FirstOrDefault();
            if (user == null) { user = new User { Id = Guid.NewGuid(), Nickname = request.Nickname }; await _supabase.From<User>().Insert(user); }

            var likeRes = await _supabase.From<WikiLike>()
                .Where(l => l.UserId == user.Id)
                .Where(l => l.RestaurantId == request.RestaurantId)
                .Where(l => l.TargetUserId == request.TargetUserId)
                .Get();
            var existingLike = likeRes.Models.FirstOrDefault();

            bool isLikedNow = false;
            int change = 0;

            if (existingLike != null)
            {
                await _supabase.From<WikiLike>().Where(l => l.Id == existingLike.Id).Delete();
                change = -1; isLikedNow = false;
            }
            else
            {
                await _supabase.From<WikiLike>().Insert(new WikiLike { UserId = user.Id, RestaurantId = request.RestaurantId, TargetUserId = request.TargetUserId, CreatedAt = DateTime.UtcNow });
                change = 1; isLikedNow = true;
            }

            var pRes = await _supabase.From<WikiPost>().Where(p => p.RestaurantId == request.RestaurantId).Get();
            var post = pRes.Models.FirstOrDefault();
            int newCount = (post?.LikeCount ?? 0) + change;
            if (newCount < 0) newCount = 0;
            if (post != null) await _supabase.From<WikiPost>().Where(p => p.Id == post.Id).Set(p => p.LikeCount, newCount).Update();

            var authorRes = await _supabase.From<User>().Where(u => u.Id == request.TargetUserId).Get();
            var author = authorRes.Models.FirstOrDefault();
            if (author != null)
            {
                int newTotal = author.TotalLikes + change;
                if (newTotal < 0) newTotal = 0;
                await _supabase.From<User>().Where(u => u.Id == author.Id).Set(u => u.TotalLikes, newTotal).Update();
            }
            return Ok(new { newLikeCount = newCount, isLiked = isLikedNow });
        }

        // ------------------------------------------------
        // (6) 찜하기
        // ------------------------------------------------
        [HttpPost("bookmark")]
        public async Task<IActionResult> ToggleBookmark([FromBody] BookmarkRequestDto request)
        {
            try
            {
                var userRes = await _supabase.From<User>().Where(u => u.Nickname == request.Nickname).Get();
                var user = userRes.Models.FirstOrDefault();
                if (user == null) return BadRequest("로그인이 필요합니다.");

                await _supabase.From<Restaurant>().Upsert(new Restaurant { Id = request.RestaurantId, Name = request.RestaurantName ?? "이름 없음", Address = request.Address, X = request.X, Y = request.Y });

                var existRes = await _supabase.From<UserBookmark>().Where(b => b.UserId == user.Id).Where(b => b.RestaurantId == request.RestaurantId).Get();
                var existing = existRes.Models.FirstOrDefault();

                if (existing != null)
                {
                    await _supabase.From<UserBookmark>().Where(x => x.Id == existing.Id).Delete();
                    return Ok(new { isBookmarked = false, message = "찜 취소 💔" });
                }
                else
                {
                    await _supabase.From<UserBookmark>().Insert(new UserBookmark { UserId = user.Id, RestaurantId = request.RestaurantId, CreatedAt = DateTime.UtcNow });
                    return Ok(new { isBookmarked = true, message = "찜 완료 ❤️" });
                }
            }
            catch (Exception ex) { return StatusCode(500, $"서버 에러: {ex.Message}"); }
        }

        // ------------------------------------------------
        // (7) 인정하기
        // ------------------------------------------------
        [HttpPost("ack")]
        public async Task<IActionResult> Ack([FromBody] AckRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Nickname)) return BadRequest("닉네임 필수");
            var uRes = await _supabase.From<User>().Where(u => u.Nickname == request.Nickname).Get();
            var user = uRes.Models.FirstOrDefault();
            if (user == null) { user = new User { Id = Guid.NewGuid(), Nickname = request.Nickname, CreatedAt = DateTime.UtcNow }; await _supabase.From<User>().Insert(user); }

            var ackCheck = await _supabase.From<UserAck>().Where(a => a.UserId == user.Id).Where(a => a.RestaurantId == request.RestaurantId).Get();
            if (ackCheck.Models.Any()) return BadRequest("이미 인정하셨습니다.");

            var rRes = await _supabase.From<Restaurant>().Where(r => r.Id == request.RestaurantId).Get();
            var restaurant = rRes.Models.FirstOrDefault();
            int newCount = 1;
            if (restaurant == null) { restaurant = new Restaurant { Id = request.RestaurantId, Name = "정보 없음", AckCount = 1 }; await _supabase.From<Restaurant>().Insert(restaurant); }
            else { newCount = restaurant.AckCount + 1; await _supabase.From<Restaurant>().Where(r => r.Id == request.RestaurantId).Set(r => r.AckCount, newCount).Update(); }

            await _supabase.From<UserAck>().Insert(new UserAck { UserId = user.Id, RestaurantId = request.RestaurantId });
            return Ok(new { newAckCount = newCount });
        }
        // ------------------------------------------------
        // (8) 히스토리 조회 (복구됨)
        // ------------------------------------------------
        [HttpGet("history/{restaurantId}")]
        public async Task<IActionResult> GetHistory(string restaurantId)
        {
            var pRes = await _supabase.From<WikiPost>().Where(x => x.RestaurantId == restaurantId).Get();
            var post = pRes.Models.FirstOrDefault();
            if (post == null) return NotFound("아직 작성된 글이 없습니다.");

            var hRes = await _supabase.From<WikiHistory>()
                .Where(x => x.PostId == post.Id)
                .Order("archived_at", Supabase.Postgrest.Constants.Ordering.Descending)
                .Get();

            var cleanHistory = hRes.Models.Select(h => new
            {
                Id = h.Id,
                Version = h.Version,
                ArchivedAt = h.ArchivedAt,
                EditorId = h.EditorId
            });
            return Ok(cleanHistory);
        }

        // ------------------------------------------------
        // (9) 롤백 (복구됨)
        // ------------------------------------------------
        [HttpPost("rollback")]
        public async Task<IActionResult> Rollback([FromBody] RollbackRequestDto request)
        {
            var hRes = await _supabase.From<WikiHistory>().Where(x => x.Id == request.HistoryId).Get();
            var target = hRes.Models.FirstOrDefault();
            if (target == null) return NotFound("기록을 찾을 수 없습니다.");

            var pRes = await _supabase.From<WikiPost>().Where(x => x.Id == target.PostId).Get();
            var current = pRes.Models.FirstOrDefault();
            if (current == null) return NotFound("원본 글이 없습니다.");

            // 현재 상태 백업
            await _supabase.From<WikiHistory>().Insert(new WikiHistory
            {
                PostId = current.Id,
                Content = current.Content,
                Version = current.Version,
                EditorId = current.AuthorId,
                ArchivedAt = DateTime.UtcNow
            });

            // 복구 실행
            await _supabase.From<WikiPost>().Where(x => x.Id == current.Id)
                .Set(x => x.Content, target.Content)
                .Set(x => x.Version, current.Version + 1)
                .Set(x => x.UpdatedAt, DateTime.UtcNow)
                .Update();

            return Ok(new { message = "복구 완료" });
        }

        // ------------------------------------------------
        // (10) 맛집 랭킹 (수정됨: JSON 에러 방지)
        // ------------------------------------------------
        [HttpGet("rank")]
        public async Task<IActionResult> GetRestaurantRanking()
        {
            try
            {
                var result = await _supabase.From<Restaurant>()
                    .Order("ack_count", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Limit(10).Get();

                // ★ 수정된 부분: 모델을 직접 반환하지 않고, 필요한 정보만 뽑아서 보냅니다.
                var cleanRanking = result.Models.Select(r => new
                {
                    Id = r.Id,
                    Name = r.Name,
                    Address = r.Address,
                    AckCount = r.AckCount,
                    X = r.X,
                    Y = r.Y
                });

                return Ok(cleanRanking);
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        // ------------------------------------------------
        // (11) 이미지 업로드 (NEW)
        // ------------------------------------------------
        [HttpPost("upload")]
        public async Task<IActionResult> UploadImage([FromForm] string restaurantId, [FromForm] string nickname, [FromForm] Microsoft.AspNetCore.Http.IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0) return BadRequest("파일이 없습니다.");
                if (string.IsNullOrEmpty(restaurantId) || string.IsNullOrEmpty(nickname)) return BadRequest("필수 정보 누락");

                // 1. 유저 확인
                var uRes = await _supabase.From<User>().Where(u => u.Nickname == nickname).Get();
                var user = uRes.Models.FirstOrDefault();
                if (user == null) { user = new User { Id = Guid.NewGuid(), Nickname = nickname }; await _supabase.From<User>().Insert(user); }

                // 2. 식당 확인 (없으면 생성)
                var rRes = await _supabase.From<Restaurant>().Where(r => r.Id == restaurantId).Get();
                if (!rRes.Models.Any()) await _supabase.From<Restaurant>().Insert(new Restaurant { Id = restaurantId, Name = "정보 없음", AckCount = 0 });

                // 3. 파일명 생성 (중복 방지용 UUID 사용)
                var fileExt = System.IO.Path.GetExtension(file.FileName);
                var fileName = $"{restaurantId}/{Guid.NewGuid()}{fileExt}"; // 폴더구조: 식당ID/랜덤파일명.jpg

                // 4. Supabase Storage에 업로드
                using var memoryStream = new System.IO.MemoryStream();
                await file.CopyToAsync(memoryStream);
                var bytes = memoryStream.ToArray();

                // 'food-images' 버킷에 업로드
                await _supabase.Storage.From("food-images").Upload(bytes, fileName);

                // 5. 공개 URL 가져오기
                var publicUrl = _supabase.Storage.From("food-images").GetPublicUrl(fileName);

                // 6. DB에 URL 저장
                var newImage = new WikiImage
                {
                    RestaurantId = restaurantId,
                    UserId = user.Id,
                    ImageUrl = publicUrl,
                    CreatedAt = DateTime.UtcNow
                };
                await _supabase.From<WikiImage>().Insert(newImage);

                return Ok(new { message = "업로드 성공", imageUrl = publicUrl });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"업로드 실패: {ex.Message}");
            }
        }
    }
}