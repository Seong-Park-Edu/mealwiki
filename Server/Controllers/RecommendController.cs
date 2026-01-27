using Microsoft.AspNetCore.Mvc;
using Server.Models; // 모델 네임스페이스 확인 필요
using System.Linq;

namespace Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RecommendController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        public RecommendController(Supabase.Client supabase) { _supabase = supabase; }

        // 1. 추천 로그 기록 (기존 로직 유지)
        public class RecommendLogRequest
        {
            public string RestaurantId { get; set; } = null!;
            public string Name { get; set; } = null!;
            public string Address { get; set; } = null!;
            public string? X { get; set; }
            public string? Y { get; set; }
        }

        [HttpPost("log")]
        public async Task<IActionResult> LogRecommend([FromBody] RecommendLogRequest request)
        {
            try
            {
                // 1. 식당 정보 Upsert
                var restaurant = new Restaurant
                {
                    Id = request.RestaurantId,
                    Name = request.Name,
                    Address = request.Address,
                    X = request.X,
                    Y = request.Y,
                    AckCount = 0
                };
                await _supabase.From<Restaurant>().Upsert(restaurant);

                // 2. 로그 Insert
                var log = new RecommendLog
                {
                    RestaurantId = request.RestaurantId,
                    CreatedAt = DateTime.UtcNow
                };
                await _supabase.From<RecommendLog>().Insert(log);

                return Ok();
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        // 2. 오늘의 검색(추천) 랭킹 조회 (★ 수정됨)
        [HttpGet("rank")]
        public async Task<IActionResult> GetSearchRank([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try 
            {
                var today = DateTime.UtcNow.Date;
                int skip = (page - 1) * pageSize;

                // 1. 오늘 로그 가져오기
                var response = await _supabase.From<RecommendLog>()
                    .Where(x => x.CreatedAt >= today)
                    .Get();

                // 2. 그룹화 및 페이징 처리 (메모리 연산)
                var groupedList = response.Models
                    .GroupBy(x => x.RestaurantId)
                    .Select(g => new { RestaurantId = g.Key, Count = g.Count() })
                    .OrderByDescending(x => x.Count)
                    .ToList(); // 전체 리스트를 먼저 만듦

                // ★ 여기서 페이징을 수행 (전체 리스트에서 잘라내기)
                var pagedList = groupedList
                    .Skip(skip)
                    .Take(pageSize)
                    .ToList();

                // 데이터가 없으면 빈 리스트 반환
                if (!pagedList.Any()) return Ok(new List<object>());

                // 3. 식당 상세 정보 조인
                var resIds = pagedList.Select(x => x.RestaurantId).ToList();
                var restaurantDetails = await _supabase.From<Restaurant>()
                    .Filter("id", Supabase.Postgrest.Constants.Operator.In, resIds)
                    .Get();

                var result = pagedList.Select(t =>
                {
                    var detail = restaurantDetails.Models.FirstOrDefault(r => r.Id == t.RestaurantId);
                    return new
                    {
                        id = t.RestaurantId,
                        name = detail?.Name ?? "정보 없음",
                        address = detail?.Address ?? "주소 미등록",
                        count = t.Count,
                        x = detail?.X,
                        y = detail?.Y
                    };
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
    }
}