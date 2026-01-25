using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Threading.Tasks;
using System.Linq; // FirstOrDefault 사용을 위해 필요
using Server.Models;

namespace Server.Controllers
{
    // 1. [해결 핵심] 파라미터를 담을 DTO 클래스를 정의합니다.
    // Swagger가 이 클래스를 보고 "아, 이 3개를 폼 데이터로 받는구나"라고 이해합니다.
    public class ImageUploadDto
    {
        public IFormFile File { get; set; }
        public string RestaurantId { get; set; }
        public string Nickname { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class UploadController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public UploadController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        [HttpPost]
        // 2. [해결 핵심] 개별 변수 대신 DTO 객체(request) 하나로 받습니다.
        public async Task<IActionResult> UploadImage([FromForm] ImageUploadDto request)
        {
            // 3. 변수 접근 시 'request.'을 붙여야 합니다.
            var file = request.File;
            var restaurantId = request.RestaurantId;
            var nickname = request.Nickname;

            // 유효성 검사
            if (file == null || file.Length == 0) return BadRequest("파일이 없습니다.");
            if (string.IsNullOrEmpty(restaurantId)) return BadRequest("식당 ID가 없습니다.");

            try
            {
                // 파일명 처리
                var extension = Path.GetExtension(file.FileName);
                var fileName = $"{Guid.NewGuid()}{extension}";
                var uploadPath = $"{restaurantId}/{fileName}";

                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                var fileBytes = memoryStream.ToArray();

                // 스토리지 업로드
                await _supabase.Storage
                    .From("food-images")
                    .Upload(fileBytes, uploadPath);

                // 공개 URL 가져오기
                var publicUrl = _supabase.Storage
                    .From("food-images")
                    .GetPublicUrl(uploadPath);

                // DB 저장 로직
                // 닉네임으로 유저 찾기
                var userRes = await _supabase.From<User>()
                                             .Where(u => u.Nickname == nickname)
                                             .Get();
                var user = userRes.Models.FirstOrDefault();

                if (user != null)
                {
                    var newImageRecord = new WikiImage
                    {
                        RestaurantId = restaurantId,
                        ImageUrl = publicUrl,
                        UserId = user.Id,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _supabase.From<WikiImage>().Insert(newImageRecord);
                }

                return Ok(new { url = publicUrl });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"업로드 및 DB 저장 실패: {ex.Message}");
            }
        }
    }
}