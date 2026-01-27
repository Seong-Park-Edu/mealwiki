using Microsoft.AspNetCore.Mvc;
using Server.Models;
using System.Linq;



namespace Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RecommendController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        public RecommendController(Supabase.Client supabase) { _supabase = supabase; }

        // 1. 추천 로그 기록 (룰렛/지도 결과 발생 시 호출)
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
                // 1. 식당 정보가 DB에 없으면 생성하거나, 있으면 업데이트(Upsert)
                // 보류 중인 '정보 없음' 문제를 해결하기 위해 식당 정보를 먼저 저장합니다.
                var restaurant = new Restaurant
                {
                    Id = request.RestaurantId,
                    Name = request.Name,
                    Address = request.Address,
                    X = request.X,
                    Y = request.Y,
                    AckCount = 0 // 초기값
                };
                await _supabase.From<Restaurant>().Upsert(restaurant);

                // 2. 추천 로그 기록
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

        // 2. 오늘의 검색(추천) 랭킹 조회
        [HttpGet("rank")]
        public async Task<IActionResult> GetSearchRank()
        {
            // 오늘 날짜 00:00:00 기준
            var today = DateTime.UtcNow.Date;

            // 전체 로그를 가져와서 서버사이드에서 그룹화 (오늘 데이터만)
            var response = await _supabase.From<RecommendLog>()
                .Where(x => x.CreatedAt >= today)
                .Get();

            var topList = response.Models
                .GroupBy(x => x.RestaurantId)
                .OrderByDescending(g => g.Count())
                .Take(10)
                .Select(g => new
                {
                    RestaurantId = g.Key,
                    Count = g.Count()
                }).ToList();

            // 식당 정보 조인을 위해 Restaurant 테이블 참조
            var resIds = topList.Select(x => x.RestaurantId).ToList();
            var restaurantDetails = await _supabase.From<Restaurant>()
                .Filter("id", Supabase.Postgrest.Constants.Operator.In, resIds)
                .Get();

            // 최종 데이터 조합 (식당 이름 포함)
            var result = topList.Select(t =>
            {
                var detail = restaurantDetails.Models.FirstOrDefault(r => r.Id == t.RestaurantId);
                return new
                {
                    id = t.RestaurantId,
                    name = detail?.Name ?? "정보 없음",
                    address = detail?.Address ?? "주소 미등록",
                    count = t.Count
                };
            });

            return Ok(result);
        }


    }
}