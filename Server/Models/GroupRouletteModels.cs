using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Server.Models
{
    // 1. 방 정보 테이블
    [Table("rouletterooms")]
    public class RouletteRoom : BaseModel
    {
        [PrimaryKey("id")]
        public string Id { get; set; }

        [Column("room_code")]
        public string RoomCode { get; set; }

        [Column("host_id")]
        public string HostId { get; set; }

        [Column("title")]
        public string Title { get; set; }

        [Column("status")]
        public string Status { get; set; } // waiting, spinning, finished

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        
        [Column("winner_menu")]
        public string WinnerMenu { get; set; }
    }

    // 2. 후보 메뉴 테이블
    [Table("roomcandidates")]
    public class RoomCandidate : BaseModel
    {
        [PrimaryKey("id")]
        public long Id { get; set; }

        [Column("room_id")]
        public string RoomId { get; set; }

        [Column("menu_name")]
        public string MenuName { get; set; }

        [Column("user_name")]
        public string UserName { get; set; }

        [Column("is_vetoed")]
        public bool IsVetoed { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }

    // 3. API 요청용 DTO (데이터 전송 객체)
    public class CreateRoomRequest
    {
        public string HostId { get; set; }
        public string Title { get; set; }
    }

    public class AddMenuRequest
    {
        public string RoomCode { get; set; } // 사용자는 코드만 알고 있음
        public string MenuName { get; set; }
        public string UserName { get; set; }
    }
}