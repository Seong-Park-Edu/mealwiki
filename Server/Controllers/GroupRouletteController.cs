using Microsoft.AspNetCore.Mvc;
using Server.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GroupRouletteController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public GroupRouletteController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // 1. 방 생성하기
        [HttpPost("create")]
        public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
        {
            try
            {
                var roomCode = GenerateRandomCode(6);

                var newRoom = new RouletteRoom
                {
                    RoomCode = roomCode,
                    HostId = request.HostId,
                    Title = request.Title ?? "오늘 뭐 먹지?",
                    Status = "waiting"
                };

                // Supabase에 저장
                var response = await _supabase.From<RouletteRoom>().Insert(newRoom);
                var createdRoom = response.Models.FirstOrDefault();

                return Ok(new { Success = true, RoomCode = roomCode, RoomId = createdRoom?.Id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        // 2. 메뉴 추가하기
        [HttpPost("add-menu")]
        public async Task<IActionResult> AddMenu([FromBody] AddMenuRequest request)
        {
            try
            {
                // RoomCode로 RoomId 찾기
                var roomResponse = await _supabase.From<RouletteRoom>()
                    .Select("id")
                    .Filter("room_code", Supabase.Postgrest.Constants.Operator.Equals, request.RoomCode)
                    .Single();

                if (roomResponse == null) return NotFound("방을 찾을 수 없습니다.");

                var newMenu = new RoomCandidate
                {
                    RoomId = roomResponse.Id,
                    MenuName = request.MenuName,
                    UserName = request.UserName,
                    IsVetoed = false,
                    CreatedAt = DateTime.UtcNow
                };

                await _supabase.From<RoomCandidate>().Insert(newMenu);

                return Ok(new { Success = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        // 6자리 랜덤 코드 생성기
        private string GenerateRandomCode(int length)
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 I,1,O,0 제외
            var random = new Random();
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }


        public class SpinRequest
        {
            public string RoomCode { get; set; }
        }

        // 3. 룰렛 돌리기 (결과 확정)
        [HttpPost("spin")]
        public async Task<IActionResult> SpinRoulette([FromBody] SpinRequest request)
        {
            try
            {
                // 1. 방 정보 찾기
                var room = await _supabase.From<RouletteRoom>()
                    .Select("id")
                    .Filter("room_code", Supabase.Postgrest.Constants.Operator.Equals, request.RoomCode)
                    .Single();

                if (room == null) return NotFound("방이 없어요.");

                // 2. 후보 메뉴들 가져오기
                var candidates = await _supabase.From<RoomCandidate>()
                    .Select("menu_name")
                    .Filter("room_id", Supabase.Postgrest.Constants.Operator.Equals, room.Id)
                    .Get();

                if (candidates.Models.Count == 0) return BadRequest("후보 메뉴가 하나도 없어요!");

                // 3. 서버에서 랜덤으로 하나 뽑기 (공정성!)
                var random = new Random();
                int index = random.Next(candidates.Models.Count);
                string winner = candidates.Models[index].MenuName;

                // 4. DB에 당첨자 업데이트 & 상태 변경
                await _supabase.From<RouletteRoom>()
                    .Where(x => x.Id == room.Id)
                    .Set(x => x.WinnerMenu, winner)
                    .Set(x => x.Status, "finished") // 상태를 끝남(finished)으로 변경
                    .Update();

                return Ok(new { Success = true, Winner = winner });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        // 4. 게임 리셋 (다시 하기)
        [HttpPost("restart")]
        public async Task<IActionResult> RestartGame([FromBody] SpinRequest request)
        {
            try
            {
                // 1. 방 정보 찾기
                var room = await _supabase.From<RouletteRoom>()
                    .Select("id")
                    .Filter("room_code", Supabase.Postgrest.Constants.Operator.Equals, request.RoomCode)
                    .Single();

                if (room == null) return NotFound("방이 없어요.");

                // 2. 방 상태를 'waiting'으로, 당첨자는 'null'로 초기화
                await _supabase.From<RouletteRoom>()
                    .Where(x => x.Id == room.Id)
                    .Set(x => x.Status, "waiting")
                    .Set(x => x.WinnerMenu, null) // 당첨자 기록 삭제
                    .Update();

                return Ok(new { Success = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

    }

}