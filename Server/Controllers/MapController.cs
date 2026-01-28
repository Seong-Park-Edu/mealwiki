using Microsoft.AspNetCore.Mvc;
using Server.Models;
using System.Threading.Tasks;
using System.Linq;
using System;
using System.Collections.Generic;

namespace Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MapController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public MapController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // GET: api/map
        // 위키 포스트가 작성된 식당만 지도에 표시합니다.
        [HttpGet]
        public async Task<IActionResult> GetAllMarkers()
        {
            try
            {
                // 1. 위키 포스트(WikiPost) 테이블에서 작성된 식당 ID만 쏙 뽑아옵니다.
                var postResult = await _supabase.From<WikiPost>()
                    .Select("restaurant_id") // ID만 조회 (데이터 절약)
                    .Get();

                // 2. 중복을 제거하여 리스트로 만듭니다. (예: 1번 식당에 글이 3개여도 ID는 하나만)
                var activeRestaurantIds = postResult.Models
                    .Select(p => p.RestaurantId)
                    .Distinct()
                    .ToList();

                // 만약 작성된 글이 하나도 없다면 빈 리스트 반환
                if (!activeRestaurantIds.Any())
                {
                    return Ok(new List<object>());
                }

                // 3. 'Restaurant' 테이블에서 위 리스트에 포함된(In) 식당만 가져옵니다.
                var result = await _supabase.From<Restaurant>()
                    .Select("id, name, address, x, y, ack_count")
                    .Filter("id", Supabase.Postgrest.Constants.Operator.In, activeRestaurantIds)
                    .Get();

                // 4. 좌표가 없는 유령 데이터 제외 및 반환
                var validMarkers = result.Models
                    .Where(r => !string.IsNullOrEmpty(r.X) && !string.IsNullOrEmpty(r.Y))
                    .Select(r => new
                    {
                        id = r.Id,
                        name = r.Name,
                        address = r.Address,
                        x = r.X,
                        y = r.Y,
                        ackCount = r.AckCount
                    });

                return Ok(validMarkers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"지도 데이터 로딩 실패: {ex.Message}");
            }
        }
    }
}