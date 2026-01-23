using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Server.Models
{
    [Table("user_acks")]
    public class UserAck : BaseModel
    {
        [PrimaryKey("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("restaurant_id")]
        public string RestaurantId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}