using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Server.Models;
using Supabase;

namespace Server.Controllers
{
    public class AuthRequest
    {
        public string? Nickname { get; set; }
        public string? Password { get; set; }
        public string? Email { get; set; }
    }

    public class FindPasswordRequest
    {
        public string? Nickname { get; set; }
        public string? Email { get; set; }
    }

    // 비밀번호 변경 요청 DTO
    public class ChangePasswordRequest
    {
        public string? Nickname { get; set; }
        public string? OldPassword { get; set; }
        public string? NewPassword { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public UserController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // 1. 회원가입
        [HttpPost("signup")]
        public async Task<IActionResult> Signup([FromBody] AuthRequest request)
        {
            if (
                string.IsNullOrWhiteSpace(request.Nickname)
                || string.IsNullOrWhiteSpace(request.Password)
            )
                return BadRequest("닉네임과 비밀번호를 입력해주세요.");

            var existing = await _supabase
                .From<User>()
                .Where(u => u.Nickname == request.Nickname)
                .Get();
            if (existing.Models.Any())
                return BadRequest("이미 존재하는 닉네임입니다.");

            var newUser = new User
            {
                Id = Guid.NewGuid(),
                Nickname = request.Nickname,
                Password = request.Password,
                Email = request.Email,
                Role = "User",
                CreatedAt = DateTime.UtcNow,
                ReviewCount = 0,
                TotalLikes = 0,
            };

            try
            {
                await _supabase.From<User>().Insert(newUser);
                return Ok(
                    new
                    {
                        message = "회원가입 성공!",
                        userId = newUser.Id,
                        nickname = newUser.Nickname,
                        role = newUser.Role,
                    }
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"회원가입 실패: {ex.Message}");
            }
        }

        // 2. 로그인
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AuthRequest request)
        {
            try
            {
                var response = await _supabase
                    .From<User>()
                    .Where(u => u.Nickname == request.Nickname)
                    .Where(u => u.Password == request.Password)
                    .Get();

                var user = response.Models.FirstOrDefault();

                if (user == null)
                    return Unauthorized("닉네임 또는 비밀번호가 틀렸습니다.");

                if (!string.IsNullOrEmpty(request.Email) && user.Email != request.Email)
                {
                    await _supabase
                        .From<User>()
                        .Where(u => u.Id == user.Id)
                        .Set(u => u.Email, request.Email)
                        .Update();
                }

                return Ok(
                    new
                    {
                        message = "로그인 성공!",
                        userId = user.Id,
                        nickname = user.Nickname,
                        role = user.Role,
                    }
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"로그인 에러: {ex.Message}");
            }
        }

        // 3. 비밀번호 찾기
        [HttpPost("find-password")]
        public async Task<IActionResult> FindPassword([FromBody] FindPasswordRequest request)
        {
            var response = await _supabase
                .From<User>()
                .Where(u => u.Nickname == request.Nickname)
                .Where(u => u.Email == request.Email)
                .Get();
            var user = response.Models.FirstOrDefault();
            if (user == null)
                return NotFound("일치하는 회원 정보가 없습니다.");

            var tempPassword = new Random().Next(1000, 9999).ToString();
            await _supabase
                .From<User>()
                .Where(u => u.Id == user.Id)
                .Set(u => u.Password, tempPassword)
                .Update();

            return Ok(new { message = "임시 비밀번호 발급 완료", tempPassword = tempPassword });
        }

        // 4. 비밀번호 변경
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var response = await _supabase
                .From<User>()
                .Where(u => u.Nickname == request.Nickname)
                .Where(u => u.Password == request.OldPassword)
                .Get();
            var user = response.Models.FirstOrDefault();
            if (user == null)
                return BadRequest("현재 비밀번호가 일치하지 않습니다.");

            await _supabase
                .From<User>()
                .Where(u => u.Id == user.Id)
                .Set(u => u.Password, request.NewPassword)
                .Update();
            return Ok(new { message = "비밀번호가 성공적으로 변경되었습니다." });
        }

        // ==========================================
        // 5. 프로필 조회 (★ 여기가 핵심! 테이블 조인 로직 추가)
        // ==========================================
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUserProfile(string userId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
                return BadRequest("ID 형식 오류");

            try
            {
                // 1. 유저 기본 정보
                var userResponse = await _supabase.From<User>().Where(u => u.Id == userGuid).Get();
                var user = userResponse.Models.FirstOrDefault();
                if (user == null)
                    return NotFound("사용자 없음");

                // 2. 작성한 리뷰, 인정 목록, 찜 목록 가져오기
                var posts = (
                    await _supabase
                        .From<WikiPost>()
                        .Filter(
                            "author_id",
                            Supabase.Postgrest.Constants.Operator.Equals,
                            userGuid.ToString()
                        )
                        .Order("updated_at", Supabase.Postgrest.Constants.Ordering.Descending)
                        .Get()
                ).Models;

                var acks = (
                    await _supabase
                        .From<UserAck>()
                        .Filter(
                            "user_id",
                            Supabase.Postgrest.Constants.Operator.Equals,
                            userGuid.ToString()
                        )
                        .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                        .Get()
                ).Models;

                var bookmarks = (
                    await _supabase
                        .From<UserBookmark>()
                        .Filter(
                            "user_id",
                            Supabase.Postgrest.Constants.Operator.Equals,
                            userGuid.ToString()
                        )
                        .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                        .Get()
                ).Models;

                // 3. ★ 모든 관련 식당 ID 수집
                var allRestaurantIds = posts
                    .Select(p => p.RestaurantId)
                    .Concat(acks.Select(a => a.RestaurantId))
                    .Concat(bookmarks.Select(b => b.RestaurantId))
                    .Distinct()
                    .ToList();

                // 4. ★ 식당 정보(이름, 주소, 좌표) 한 번에 조회
                var restaurantMap = new Dictionary<string, Restaurant>();

                if (allRestaurantIds.Any())
                {
                    var rRes = await _supabase
                        .From<Restaurant>()
                        .Filter("id", Supabase.Postgrest.Constants.Operator.In, allRestaurantIds)
                        .Get();

                    foreach (var r in rRes.Models)
                    {
                        if (!restaurantMap.ContainsKey(r.Id))
                            restaurantMap.Add(r.Id, r);
                    }
                }

                // 5. 데이터 조립 (여기서 Bookmark에 식당 정보를 넣어줍니다)
                return Ok(
                    new
                    {
                        Profile = new
                        {
                            Nickname = user.Nickname,
                            ReviewCount = user.ReviewCount,
                            TotalLikes = user.TotalLikes,
                            CreatedAt = user.CreatedAt,
                        },

                        Reviews = posts.Select(p => new
                        {
                            Id = p.Id,
                            RestaurantId = p.RestaurantId,
                            RestaurantName = restaurantMap.ContainsKey(p.RestaurantId)
                                ? restaurantMap[p.RestaurantId].Name
                                : "알 수 없음",
                            Content = p.Content,
                            LikeCount = p.LikeCount,
                            UpdatedAt = p.UpdatedAt,
                        }),

                        Acks = acks.Select(a => new
                        {
                            RestaurantId = a.RestaurantId,
                            RestaurantName = restaurantMap.ContainsKey(a.RestaurantId)
                                ? restaurantMap[a.RestaurantId].Name
                                : "식당",
                            CreatedAt = a.CreatedAt,
                        }),

                        // ★ [핵심] 찜 목록에 식당 정보(좌표 포함) 매핑
                        Bookmarks = bookmarks.Select(b =>
                        {
                            var r = restaurantMap.ContainsKey(b.RestaurantId)
                                ? restaurantMap[b.RestaurantId]
                                : null;
                            return new
                            {
                                RestaurantId = b.RestaurantId,
                                RestaurantName = r?.Name ?? "이름 없음",
                                Address = r?.Address ?? "",
                                X = r?.X, // 좌표 (프론트 지도용)
                                Y = r?.Y, // 좌표 (프론트 지도용)
                                CreatedAt = b.CreatedAt,
                            };
                        }),
                    }
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        // ------------------------------------------------
        // (6) 유저 랭킹 (수정됨: 무한 스크롤 + 동점자 정렬)
        // ------------------------------------------------
        [HttpGet("rank")]
        public async Task<IActionResult> GetUserRanking(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10
        )
        {
            try
            {
                // 1. 페이징 범위 계산
                int from = (page - 1) * pageSize;
                int to = from + pageSize - 1;

                // 2. DB 조회 (좋아요 합계 순 -> 닉네임 순)
                var result = await _supabase
                    .From<User>()
                    .Order("total_likes", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Order("nickname", Supabase.Postgrest.Constants.Ordering.Ascending) // ★ 핵심: 동점일 때 닉네임순 정렬
                    .Range(from, to)
                    .Get();

                // 3. 데이터 정제
                var cleanRanking = result.Models.Select(u => new
                {
                    Id = u.Id,
                    Nickname = u.Nickname,
                    ReviewCount = u.ReviewCount,
                    TotalLikes = u.TotalLikes,
                });

                return Ok(cleanRanking);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
    }
}
